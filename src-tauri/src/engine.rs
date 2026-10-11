//! Platform-independent motion and behavior. All coordinates are physical pixels.
use serde::Serialize;

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Pose {
    Sit,
    Loaf,
    Walk,
    Stretch,
    Pet,
    Sleep,
    Hideaway,
}

#[derive(Clone, Copy, Debug)]
pub struct Bounds {
    pub left: f64,
    pub top: f64,
    pub right: f64,
    pub bottom: f64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Frame {
    pub pose: Pose,
    pub facing: i8,
    pub clock: f64,
    pub age: f64,
    pub paused: bool,
    pub dragging: bool,
    pub falling: bool,
    pub blep: bool,
}

struct Press {
    start: (f64, f64),
    offset: (f64, f64),
    moved: bool,
}

pub struct Pet {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub scale: f64,
    pub bounds: Bounds,
    pub frame: Frame,
    velocity: f64,
    remaining: f64,
    blep_wait: f64,
    blep_left: f64,
    press: Option<Press>,
    rng: u64,
}

impl Pet {
    pub fn new(bounds: Bounds, width: f64, height: f64, scale: f64, seed: u64) -> Self {
        Self {
            x: bounds.left + (bounds.right - bounds.left - width).max(0.0) * 0.7,
            y: bounds.bottom - height,
            width,
            height,
            scale,
            bounds,
            frame: Frame {
                pose: Pose::Sit,
                facing: 1,
                clock: 0.0,
                age: 0.0,
                paused: false,
                dragging: false,
                falling: false,
                blep: false,
            },
            velocity: 0.0,
            remaining: 5.0,
            blep_wait: 18.0,
            blep_left: 0.0,
            press: None,
            rng: seed.max(1),
        }
    }
    fn random(&mut self) -> f64 {
        self.rng ^= self.rng << 13;
        self.rng ^= self.rng >> 7;
        self.rng ^= self.rng << 17;
        (self.rng >> 11) as f64 / ((1u64 << 53) as f64)
    }
    pub fn pose(&mut self, pose: Pose, seconds: f64) {
        self.frame.pose = pose;
        self.frame.age = 0.0;
        self.remaining = seconds;
        self.frame.blep = false;
        self.blep_left = 0.0;
    }
    pub fn toggle_pause(&mut self) {
        self.frame.paused = !self.frame.paused;
    }
    pub fn pressed(&self) -> bool {
        self.press.is_some()
    }
    pub fn press(&mut self, cursor: (f64, f64)) {
        self.press = Some(Press {
            start: cursor,
            offset: (cursor.0 - self.x, cursor.1 - self.y),
            moved: false,
        });
        self.velocity = 0.0;
    }
    pub fn release(&mut self) {
        if let Some(press) = self.press.take() {
            self.frame.dragging = false;
            if press.moved {
                self.frame.falling = self.y < self.floor() - 0.5;
                self.pose(Pose::Loaf, 1.2);
            } else if !self.frame.paused {
                self.pose(Pose::Pet, 2.2);
            }
        }
    }
    pub fn floor(&self) -> f64 {
        (self.bounds.bottom - self.height).max(self.bounds.top)
    }
    pub fn relocate(&mut self, bounds: Bounds, width: f64, height: f64, scale: f64) {
        let grounded = !self.frame.falling && !self.pressed();
        self.bounds = bounds;
        self.width = width;
        self.height = height;
        self.scale = scale;
        self.x = self
            .x
            .clamp(bounds.left, (bounds.right - width).max(bounds.left));
        if grounded {
            self.y = self.floor();
        } else {
            self.y = self.y.clamp(bounds.top, self.floor());
        }
    }
    pub fn tick(&mut self, dt: f64, cursor: (f64, f64), mouse_down: bool) {
        // Avoid a giant movement after OS sleep, a debugger stop or a stalled frame.
        let dt = dt.clamp(0.0, 0.05);
        if let Some(press) = &mut self.press {
            let distance = (cursor.0 - press.start.0).hypot(cursor.1 - press.start.1);
            if distance > 5.0 * self.scale {
                press.moved = true;
            }
            if press.moved {
                self.x = (cursor.0 - press.offset.0).clamp(
                    self.bounds.left,
                    (self.bounds.right - self.width).max(self.bounds.left),
                );
                self.y = (cursor.1 - press.offset.1).clamp(
                    self.bounds.top,
                    (self.bounds.bottom - self.height).max(self.bounds.top),
                );
                self.frame.dragging = true;
                self.frame.falling = false;
            }
            if !mouse_down {
                self.release();
            }
        }
        // Drag/drop remains usable while autonomous behavior is paused.
        if self.frame.falling && !self.pressed() {
            self.velocity = (self.velocity + 420.0 * self.scale * dt).min(260.0 * self.scale);
            self.y = (self.y + self.velocity * dt).min(self.floor());
            if self.y >= self.floor() {
                self.frame.falling = false;
                self.velocity = 0.0;
                self.pose(Pose::Loaf, 1.2);
            }
        }
        if self.frame.paused || self.pressed() || self.frame.falling {
            return;
        }
        self.frame.clock += dt;
        self.frame.age += dt;
        if self.frame.pose == Pose::Walk {
            self.x += self.frame.facing as f64 * 26.0 * self.scale * dt;
            let right = (self.bounds.right - self.width).max(self.bounds.left);
            if self.x < self.bounds.left {
                self.x = self.bounds.left;
                self.frame.facing = 1;
            }
            if self.x > right {
                self.x = right;
                self.frame.facing = -1;
            }
        }
        self.remaining -= dt;
        if self.remaining <= 0.0 {
            let n = self.random();
            let (pose, seconds) = match self.frame.pose {
                Pose::Sleep | Pose::Hideaway => (Pose::Stretch, 3.2),
                Pose::Stretch | Pose::Pet => (Pose::Sit, 5.0 + n * 5.0),
                _ if n < 0.40 => (Pose::Walk, 7.0 + self.random() * 10.0),
                _ if n < 0.64 => (Pose::Loaf, 6.0 + self.random() * 8.0),
                _ if n < 0.78 => (Pose::Sleep, 18.0 + self.random() * 22.0),
                _ if n < 0.90 => (Pose::Hideaway, 18.0 + self.random() * 22.0),
                _ => (Pose::Sit, 6.0),
            };
            self.pose(pose, seconds);
        }
        self.blep_wait -= dt;
        if self.blep_wait <= 0.0 && matches!(self.frame.pose, Pose::Sit | Pose::Loaf) {
            self.blep_left = 1.0 + self.random() * 1.3;
            self.blep_wait = 24.0 + self.random() * 45.0;
        }
        self.blep_left = (self.blep_left - dt).max(0.0);
        self.frame.blep = self.blep_left > 0.0;
    }
}

/// Alpha mask in logical coordinates, separate from the transparent window rectangle.
pub fn hit(mask: &[u8], x: f64, y: f64, width: f64, height: f64) -> bool {
    if mask.len() != 70 * 55 || x < 0.0 || y < 0.0 || x >= width || y >= height {
        return false;
    }
    let col = (x / width * 70.0) as usize;
    let row = (y / height * 55.0) as usize;
    mask[row * 70 + col] > 0
}

#[cfg(test)]
mod tests {
    use super::*;
    fn pet() -> Pet {
        Pet::new(
            Bounds {
                left: -1440.0,
                top: 24.0,
                right: 0.0,
                bottom: 850.0,
            },
            280.0,
            220.0,
            1.0,
            42,
        )
    }
    #[test]
    fn drop_is_gentle_and_lands_without_overshoot() {
        let mut p = pet();
        p.y = 100.0;
        p.frame.falling = true;
        let mut old = p.y;
        for _ in 0..300 {
            p.tick(1.0 / 30.0, (0.0, 0.0), false);
            assert!(p.y >= old);
            assert!(p.y - old <= 260.0 / 30.0 + 0.01);
            assert!(p.y <= p.floor());
            old = p.y;
        }
        assert_eq!(p.y, p.floor());
        assert!(!p.frame.falling);
    }
    #[test]
    fn click_pets_and_drag_drops_even_when_paused() {
        let mut p = pet();
        let c = (p.x + 100.0, p.y + 100.0);
        p.press(c);
        p.tick(0.03, c, false);
        assert_eq!(p.frame.pose, Pose::Pet);
        p.toggle_pause();
        p.press(c);
        p.tick(0.03, (c.0, c.1 - 300.0), true);
        assert!(p.frame.dragging);
        p.tick(0.03, (c.0, c.1 - 300.0), false);
        assert!(p.frame.falling);
        for _ in 0..150 {
            p.tick(0.03, c, false);
        }
        assert_eq!(p.y, p.floor());
        assert!(p.frame.paused);
    }
    #[test]
    fn pause_freezes_autonomy_and_visual_clock() {
        let mut p = pet();
        p.pose(Pose::Walk, 10.0);
        p.toggle_pause();
        let x = p.x;
        for _ in 0..100 {
            p.tick(0.03, (0.0, 0.0), false);
        }
        assert_eq!(p.x, x);
        assert_eq!(p.frame.clock, 0.0);
    }
    #[test]
    fn negative_monitor_origin_and_edge_turn_are_respected() {
        let mut p = pet();
        p.pose(Pose::Walk, 10.0);
        p.x = p.bounds.left;
        p.frame.facing = -1;
        p.tick(0.05, (0.0, 0.0), false);
        assert_eq!(p.x, p.bounds.left);
        assert_eq!(p.frame.facing, 1);
    }
    #[test]
    fn alpha_holes_and_high_dpi_edges_do_not_block_clicks() {
        let mut mask = vec![0; 70 * 55];
        mask[20 * 70 + 30] = 1;
        assert!(hit(&mask, 244.0, 164.0, 560.0, 440.0));
        assert!(!hit(&mask, 0.0, 0.0, 560.0, 440.0));
        assert!(!hit(&mask, 560.0, 440.0, 560.0, 440.0));
        assert!(!hit(&mask, -1.0, 164.0, 560.0, 440.0));
        assert!(!hit(&[], 244.0, 164.0, 560.0, 440.0));
    }
}
