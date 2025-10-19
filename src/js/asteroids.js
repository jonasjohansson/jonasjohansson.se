// Classic Asteroids game for intro page background
export class AsteroidsGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = canvas.width;
    this.height = canvas.height;

    // Game state
    this.gameRunning = false;
    this.score = 0;
    this.level = 1;

    // Ship
    this.ship = {
      x: this.width / 2,
      y: this.height / 2,
      angle: 0,
      velocity: { x: 0, y: 0 },
      thrust: false,
      rotating: 0, // -1, 0, 1
      invulnerable: 0,
      lastHitTime: 0, // Prevent rapid-fire hits
    };

    // Game objects
    this.bullets = [];
    this.asteroids = [];
    this.particles = [];
    this.saucer = null;
    this.saucerBullets = [];

    // Controls
    this.keys = {};

    // Initialize
    this.setupEventListeners();
    this.generateAsteroids();
    this.start();
  }

  setupEventListeners() {
    document.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
    });

    document.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });
  }

  start() {
    this.gameRunning = true;
    this.gameLoop();
  }

  stop() {
    this.gameRunning = false;
  }

  generateAsteroids() {
    this.asteroids = [];
    const count = Math.min(4 + this.level, 8);

    for (let i = 0; i < count; i++) {
      this.asteroids.push(this.createAsteroid());
    }
  }

  createAsteroid() {
    const side = Math.floor(Math.random() * 4);
    let x, y;

    switch (side) {
      case 0: // Top
        x = Math.random() * this.width;
        y = -50;
        break;
      case 1: // Right
        x = this.width + 50;
        y = Math.random() * this.height;
        break;
      case 2: // Bottom
        x = Math.random() * this.width;
        y = this.height + 50;
        break;
      case 3: // Left
        x = -50;
        y = Math.random() * this.height;
        break;
    }

    const size = Math.random() * 30 + 20;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2 + 1;

    return {
      x,
      y,
      size,
      angle,
      velocity: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      },
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.1,
      points: this.generateAsteroidShape(size),
    };
  }

  generateAsteroidShape(size) {
    const points = [];
    const numPoints = Math.floor(Math.random() * 4) + 6;

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const radius = size + (Math.random() - 0.5) * size * 0.5;
      points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }

    return points;
  }

  update() {
    if (!this.gameRunning) return;

    // Update ship
    this.updateShip();

    // Update bullets
    this.updateBullets();

    // Update asteroids
    this.updateAsteroids();

    // Update particles
    this.updateParticles();

    // Update saucer
    this.updateSaucer();

    // Check collisions
    this.checkCollisions();

    // Check level completion
    if (this.asteroids.length === 0) {
      this.level++;
      this.generateAsteroids();
    }
  }

  updateShip() {
    // Rotation
    if (this.keys["ArrowLeft"]) {
      this.ship.angle -= 0.1;
    }
    if (this.keys["ArrowRight"]) {
      this.ship.angle += 0.1;
    }

    // Thrust
    if (this.keys["ArrowUp"]) {
      this.ship.velocity.x += Math.cos(this.ship.angle) * 0.1;
      this.ship.velocity.y += Math.sin(this.ship.angle) * 0.1;
      this.ship.thrust = true;
    } else {
      this.ship.thrust = false;
    }

    // Apply friction
    this.ship.velocity.x *= 0.99;
    this.ship.velocity.y *= 0.99;

    // Update position
    this.ship.x += this.ship.velocity.x;
    this.ship.y += this.ship.velocity.y;

    // Wrap around screen
    if (this.ship.x < 0) this.ship.x = this.width;
    if (this.ship.x > this.width) this.ship.x = 0;
    if (this.ship.y < 0) this.ship.y = this.height;
    if (this.ship.y > this.height) this.ship.y = 0;

    // Decrease invulnerability
    if (this.ship.invulnerable > 0) {
      this.ship.invulnerable--;
    }
  }

  updateBullets() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.x += bullet.velocity.x;
      bullet.y += bullet.velocity.y;
      bullet.life--;

      // Remove old bullets
      if (bullet.life <= 0) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Wrap around screen
      if (bullet.x < 0) bullet.x = this.width;
      if (bullet.x > this.width) bullet.x = 0;
      if (bullet.y < 0) bullet.y = this.height;
      if (bullet.y > this.height) bullet.y = 0;
    }
  }

  updateAsteroids() {
    for (let asteroid of this.asteroids) {
      asteroid.x += asteroid.velocity.x;
      asteroid.y += asteroid.velocity.y;
      asteroid.rotation += asteroid.rotationSpeed;

      // Wrap around screen
      if (asteroid.x < -100) asteroid.x = this.width + 100;
      if (asteroid.x > this.width + 100) asteroid.x = -100;
      if (asteroid.y < -100) asteroid.y = this.height + 100;
      if (asteroid.y > this.height + 100) asteroid.y = -100;
    }
  }

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.x += particle.velocity.x;
      particle.y += particle.velocity.y;
      particle.life--;

      if (particle.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  updateSaucer() {
    // Simple saucer that appears occasionally
    if (!this.saucer && Math.random() < 0.001) {
      this.saucer = {
        x: Math.random() < 0.5 ? -50 : this.width + 50,
        y: Math.random() * this.height,
        velocity: { x: Math.random() < 0.5 ? 1 : -1, y: 0 },
        shootTimer: 0,
      };
    }

    if (this.saucer) {
      this.saucer.x += this.saucer.velocity.x;
      this.saucer.shootTimer++;

      // Remove saucer if off screen
      if (this.saucer.x < -100 || this.saucer.x > this.width + 100) {
        this.saucer = null;
        return; // Exit early if saucer is removed
      }

      // Saucer shooting
      if (this.saucer && this.saucer.shootTimer > 60) {
        this.saucerBullets.push({
          x: this.saucer.x,
          y: this.saucer.y,
          velocity: {
            x: (this.ship.x - this.saucer.x) * 0.02,
            y: (this.ship.y - this.saucer.y) * 0.02,
          },
          life: 120,
        });
        this.saucer.shootTimer = 0;
      }
    }

    // Update saucer bullets
    for (let i = this.saucerBullets.length - 1; i >= 0; i--) {
      const bullet = this.saucerBullets[i];
      bullet.x += bullet.velocity.x;
      bullet.y += bullet.velocity.y;
      bullet.life--;

      if (bullet.life <= 0) {
        this.saucerBullets.splice(i, 1);
      }
    }
  }

  checkCollisions() {
    // Bullet vs Asteroid
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];

      for (let j = this.asteroids.length - 1; j >= 0; j--) {
        const asteroid = this.asteroids[j];
        const dx = bullet.x - asteroid.x;
        const dy = bullet.y - asteroid.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < asteroid.size) {
          // Hit!
          this.bullets.splice(i, 1);
          this.breakAsteroid(asteroid, j);
          this.score += 10;
          break;
        }
      }
    }

    // Ship vs Asteroid
    if (this.ship.invulnerable === 0) {
      const currentTime = Date.now();
      for (let asteroid of this.asteroids) {
        const dx = this.ship.x - asteroid.x;
        const dy = this.ship.y - asteroid.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < asteroid.size + 10 && currentTime - this.ship.lastHitTime > 500) {
          this.shipHit();
          this.ship.lastHitTime = currentTime;
          break;
        }
      }
    }

    // Ship vs Saucer bullet
    const currentTime = Date.now();
    for (let bullet of this.saucerBullets) {
      const dx = this.ship.x - bullet.x;
      const dy = this.ship.y - bullet.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 10 && currentTime - this.ship.lastHitTime > 500) {
        this.shipHit();
        this.ship.lastHitTime = currentTime;
        break;
      }
    }
  }

  breakAsteroid(asteroid, index) {
    this.asteroids.splice(index, 1);

    // Create explosion particles
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: asteroid.x,
        y: asteroid.y,
        velocity: {
          x: (Math.random() - 0.5) * 4,
          y: (Math.random() - 0.5) * 4,
        },
        life: 30,
      });
    }

    // Create smaller asteroids if large enough
    if (asteroid.size > 15) {
      for (let i = 0; i < 2; i++) {
        this.asteroids.push({
          x: asteroid.x,
          y: asteroid.y,
          size: asteroid.size * 0.6,
          angle: Math.random() * Math.PI * 2,
          velocity: {
            x: Math.cos(Math.random() * Math.PI * 2) * 2,
            y: Math.sin(Math.random() * Math.PI * 2) * 2,
          },
          rotation: 0,
          rotationSpeed: (Math.random() - 0.5) * 0.1,
          points: this.generateAsteroidShape(asteroid.size * 0.6),
        });
      }
    }
  }

  shipHit() {
    this.ship.invulnerable = 120; // 2 seconds of invulnerability

    // Push ship away from nearby asteroids to prevent immediate re-collision
    for (let asteroid of this.asteroids) {
      const dx = this.ship.x - asteroid.x;
      const dy = this.ship.y - asteroid.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < asteroid.size + 20) {
        // Push ship away from asteroid
        const pushDistance = asteroid.size + 30;
        const angle = Math.atan2(dy, dx);
        this.ship.x = asteroid.x + Math.cos(angle) * pushDistance;
        this.ship.y = asteroid.y + Math.sin(angle) * pushDistance;

        // Wrap around screen if pushed off
        if (this.ship.x < 0) this.ship.x = this.width;
        if (this.ship.x > this.width) this.ship.x = 0;
        if (this.ship.y < 0) this.ship.y = this.height;
        if (this.ship.y > this.height) this.ship.y = 0;
      }
    }

    // Create explosion particles
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x: this.ship.x,
        y: this.ship.y,
        velocity: {
          x: (Math.random() - 0.5) * 6,
          y: (Math.random() - 0.5) * 6,
        },
        life: 40,
      });
    }

    // No game over - infinite lives for background game
  }

  shoot() {
    if (this.bullets.length < 4) {
      // Limit bullets
      this.bullets.push({
        x: this.ship.x,
        y: this.ship.y,
        velocity: {
          x: Math.cos(this.ship.angle) * 8,
          y: Math.sin(this.ship.angle) * 8,
        },
        life: 60,
      });
    }
  }

  render() {
    // Clear canvas completely - no trails
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw stars
    this.drawStars();

    // Draw ship
    this.drawShip();

    // Draw bullets
    this.drawBullets();

    // Draw asteroids
    this.drawAsteroids();

    // Draw particles
    this.drawParticles();

    // Draw saucer
    this.drawSaucer();

    // No UI needed for background game
  }

  drawStars() {
    this.ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 50; i++) {
      const x = (i * 137.5) % this.width;
      const y = (i * 197.3) % this.height;
      this.ctx.fillRect(x, y, 1, 1);
    }
  }

  drawShip() {
    if (this.ship.invulnerable > 0 && Math.floor(this.ship.invulnerable / 5) % 2) {
      return; // Blink when invulnerable
    }

    this.ctx.save();
    this.ctx.translate(this.ship.x, this.ship.y);
    this.ctx.rotate(this.ship.angle);

    this.ctx.strokeStyle = "#ffffff";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(15, 0);
    this.ctx.lineTo(-10, -8);
    this.ctx.lineTo(-5, 0);
    this.ctx.lineTo(-10, 8);
    this.ctx.closePath();
    this.ctx.stroke();

    // Draw thrust flame
    if (this.ship.thrust) {
      this.ctx.strokeStyle = "#ffffff";
      this.ctx.beginPath();
      this.ctx.moveTo(-5, 0);
      this.ctx.lineTo(-15, -3);
      this.ctx.lineTo(-12, 0);
      this.ctx.lineTo(-15, 3);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  drawBullets() {
    this.ctx.fillStyle = "#ffffff";
    for (let bullet of this.bullets) {
      this.ctx.fillRect(bullet.x - 1, bullet.y - 1, 2, 2);
    }

    for (let bullet of this.saucerBullets) {
      this.ctx.fillStyle = "#ffffff";
      this.ctx.fillRect(bullet.x - 1, bullet.y - 1, 2, 2);
    }
  }

  drawAsteroids() {
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.lineWidth = 2;

    for (let asteroid of this.asteroids) {
      this.ctx.save();
      this.ctx.translate(asteroid.x, asteroid.y);
      this.ctx.rotate(asteroid.rotation);

      this.ctx.beginPath();
      this.ctx.moveTo(asteroid.points[0].x, asteroid.points[0].y);
      for (let i = 1; i < asteroid.points.length; i++) {
        this.ctx.lineTo(asteroid.points[i].x, asteroid.points[i].y);
      }
      this.ctx.closePath();
      this.ctx.stroke();

      this.ctx.restore();
    }
  }

  drawParticles() {
    this.ctx.fillStyle = "#ffffff";
    for (let particle of this.particles) {
      this.ctx.fillRect(particle.x - 1, particle.y - 1, 2, 2);
    }
  }

  drawSaucer() {
    if (this.saucer) {
      this.ctx.strokeStyle = "#ffffff";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.ellipse(this.saucer.x, this.saucer.y, 15, 8, 0, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  gameLoop() {
    if (!this.gameRunning) return;

    this.update();
    this.render();

    requestAnimationFrame(() => this.gameLoop());
  }
}

// Initialize when DOM is ready
export function initAsteroids() {
  const canvas = document.getElementById("asteroids-canvas");
  if (!canvas) return;

  // Set canvas size
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const game = new AsteroidsGame(canvas);

  // Store globally so it can be stopped
  window.asteroidsGame = game;

  // Handle shooting
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      game.shoot();
    }
  });

  // Handle window resize
  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    game.width = canvas.width;
    game.height = canvas.height;
  });

  return game;
}
