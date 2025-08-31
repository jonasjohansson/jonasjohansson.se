// boids.js — tighter, coherent flock; steer clear of ground (no bumping).
export function registerBoids() {
  const THREE = window.THREE;

  if (!AFRAME.components["boid"]) {
    AFRAME.registerComponent("boid", {
      schema: {
        ground: { type: "boolean", default: false },
        minAltitude: { type: "number", default: 0.5 },
      },

      init() {
        const p = this.el.object3D.position;
        this.minY = this.data.minAltitude;
        if (p.y < this.minY) p.y = this.minY;

        // Kinematics
        this.velocity = new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(2.5),
          THREE.MathUtils.randFloat(0.1, 0.8),
          THREE.MathUtils.randFloatSpread(2.5)
        );
        this.accel = new THREE.Vector3();

        // Helpers
        this._attention = null;
        this._tmp = new THREE.Vector3();
        this._tmp2 = new THREE.Vector3();
        this._up = new THREE.Vector3(0, 1, 0);

        // World bounds
        this.bounds = 55;
        this.maxY = 24;

        // Cohesive murmuration tuning
        this.neighborRadius = 14.0;
        this.desiredSep = 0.9;

        this.sepW = 0.45;
        this.aliW = 2.2;
        this.cohW = 1.35;
        this.centerW = 0.5;
        this.swirlW = 0.08; // even subtler swirl
        this.globalW = 0.18;

        this.maxSpeed = 11.0;
        this.minSpeed = 4.5;
        this.maxAccel = 9.0;

        // Visuals (no white emissive updates anymore)
        this.bankAmount = 14;
        this._pulsePhase = Math.random() * Math.PI * 2;
      },

      attendTo(targetVec3) {
        this._attention = targetVec3.clone();
      },
      clearAttention() {
        this._attention = null;
      },

      tick(time, dtMs) {
        const dt = Math.min(dtMs / 1000, 0.033);
        const p = this.el.object3D.position;
        const v = this.velocity;
        const a = this.accel;
        a.set(0, 0, 0);

        if (this.data.ground) {
          // Ground mode: 2D meander + face attention
          p.y = this.minY;
          v.y = 0;
          if (this._attention) {
            v.multiplyScalar(0.85);
            const dx = this._attention.x - p.x;
            const dz = this._attention.z - p.z;
            if (dx * dx + dz * dz > 1e-6) {
              const yaw = (Math.atan2(dx, dz) * 180) / Math.PI;
              const r = this.el.getAttribute("rotation");
              const newY = THREE.MathUtils.lerp(r.y, yaw, 0.25);
              this.el.setAttribute("rotation", `0 ${newY} 0`);
            }
          } else {
            const n2d = this._neighbors2D(16, 6.0);
            v.x += (n2d.sepX * 0.7 + n2d.aliX * 0.35 + n2d.cohX * 0.2) * dt;
            v.z += (n2d.sepZ * 0.7 + n2d.aliZ * 0.35 + n2d.cohZ * 0.2) * dt;
            v.x += -p.x * 0.2 * dt;
            v.z += -p.z * 0.2 * dt;

            const lim = this.bounds,
              margin = 1;
            if (p.x < -lim + margin) v.x += 2.0 * dt;
            if (p.x > lim - margin) v.x -= 2.0 * dt;
            if (p.z < -lim + margin) v.z += 2.0 * dt;
            if (p.z > lim - margin) v.z -= 2.0 * dt;

            const sp = v.length();
            const maxGround = 2.2;
            if (sp > maxGround) v.multiplyScalar(maxGround / sp);

            if (v.lengthSq() > 1e-6) {
              const yaw = (Math.atan2(v.x, v.z) * 180) / Math.PI;
              this.el.setAttribute("rotation", `0 ${yaw} 0`);
            }
            p.addScaledVector(v, dt);
          }
          return;
        }

        // --- AIR (cohesive murmuration) ---
        const { sep, ali, coh } = this._neighbors3D(48, this.neighborRadius, this.desiredSep);
        coh.y += 0.35; // gentle lift

        // Centering + minimal swirl
        const centerDir = this._tmp.copy(p).multiplyScalar(-1);
        centerDir.y *= 2.0;

        const radial = this._tmp2.copy(p).normalize();
        const swirl = this._up.clone().cross(radial);

        // tiny global drift
        const t = time * 0.0002;
        const globalDir = new THREE.Vector3(Math.sin(t * 0.9), 0.1 * Math.sin(t * 1.7), Math.cos(t * 0.9)).normalize();

        // Compose accel
        a.addScaledVector(sep, this.sepW);
        a.addScaledVector(ali, this.aliW);
        a.addScaledVector(coh, this.cohW);
        a.addScaledVector(centerDir.normalize(), this.centerW);
        a.addScaledVector(swirl, this.swirlW);
        a.addScaledVector(globalDir, this.globalW);

        // ===== floor avoidance (earlier & stronger, no bounce) =====
        const floorBuffer = 1.2; // push up sooner
        const h = p.y - this.minY;
        if (h < floorBuffer) {
          // strong lift proportional to how close + opposing downward velocity
          const lift = (floorBuffer - h) * 22.0 + Math.max(0, -v.y) * 12.0;
          a.y += lift;
        }
        // ===========================================================

        // Altitude & bounds
        if (p.y > this.maxY) a.y -= 6.0;
        const lim = this.bounds;
        if (p.x < -lim) a.x += 4.0;
        if (p.x > lim) a.x -= 4.0;
        if (p.z < -lim) a.z += 4.0;
        if (p.z > lim) a.z -= 4.0;

        // Accel cap
        const aLen = a.length();
        if (aLen > this.maxAccel) a.multiplyScalar(this.maxAccel / aLen);

        // Integrate
        v.addScaledVector(a, dt);

        // Speed limits
        let sp = v.length();
        if (sp < this.minSpeed) v.multiplyScalar(this.minSpeed / (sp || 1));
        sp = v.length();
        if (sp > this.maxSpeed) v.multiplyScalar(this.maxSpeed / sp);

        // Position
        p.addScaledVector(v, dt);

        // Final safety clamp (no bounce)
        if (p.y < this.minY) {
          p.y = this.minY;
          if (v.y < 0) v.y = 0; // just stop sinking; no reverse impulse
        }

        // Orientation (no emissive updates)
        const yaw = Math.atan2(v.x, v.z);
        const bank = THREE.MathUtils.clamp(-v.x * 0.05, -0.6, 0.6);
        this.el.object3D.rotation.set(THREE.MathUtils.degToRad(-bank * 0.35), yaw, THREE.MathUtils.degToRad(bank));
      },

      // distance-weighted neighbors
      _neighbors3D(samples, radius, desiredSep) {
        const me = this.el.object3D.position;
        const sep = new THREE.Vector3();
        const ali = new THREE.Vector3();
        const coh = new THREE.Vector3();
        let aliWsum = 0.0,
          cohWsum = 0.0;

        const ents = this.el.parentElement ? Array.from(this.el.parentElement.children) : [];
        const total = ents.length;

        for (let s = 0; s < samples; s++) {
          if (total === 0) break;
          const e = ents[(Math.random() * total) | 0];
          if (!e || e === this.el) continue;

          const op = e.object3D.position;
          const d = me.distanceTo(op);
          if (d === 0 || d > radius) continue;

          if (d < desiredSep) {
            const diff = me
              .clone()
              .sub(op)
              .multiplyScalar(1 / (d * d + 1e-3));
            sep.add(diff);
          }

          const w = 1.0 / (d + 0.0001);
          const bv = e.components.boid?.velocity;
          if (bv) {
            ali.addScaledVector(bv, w);
            aliWsum += w;
          }
          coh.addScaledVector(op, w);
          cohWsum += w;
        }

        if (aliWsum > 0) ali.multiplyScalar(1 / aliWsum).normalize();
        if (cohWsum > 0)
          coh
            .multiplyScalar(1 / cohWsum)
            .sub(me)
            .normalize();

        return { sep, ali, coh };
      },

      _neighbors2D(samples, radius) {
        const me = this.el.object3D.position;
        let sepX = 0,
          sepZ = 0,
          aliX = 0,
          aliZ = 0,
          cohX = 0,
          cohZ = 0,
          n = 0;
        const ents = this.el.parentElement ? Array.from(this.el.parentElement.children) : [];
        const total = ents.length;
        const desiredSep = 0.9;

        for (let s = 0; s < samples; s++) {
          if (total === 0) break;
          const e = ents[(Math.random() * total) | 0];
          if (!e || e === this.el) continue;

          const op = e.object3D.position;
          const dx = me.x - op.x,
            dz = me.z - op.z;
          const d2 = dx * dx + dz * dz;
          if (d2 === 0 || d2 > radius * radius) continue;
          n++;

          if (d2 < desiredSep * desiredSep) {
            const inv = 1 / (d2 + 1e-4);
            sepX += dx * inv;
            sepZ += dz * inv;
          }
          const bv = e.components.boid?.velocity;
          if (bv) {
            aliX += bv.x;
            aliZ += bv.z;
          }
          cohX += op.x;
          cohZ += op.z;
        }

        if (n) {
          aliX /= n;
          aliZ /= n;
          cohX = cohX / n - me.x;
          cohZ = cohZ / n - me.z;
        }
        return { sepX, sepZ, aliX, aliZ, cohX, cohZ };
      },
    });
  }

  // --- NEW: camera chase component ---
  if (!AFRAME.components["boid-chase-cam"]) {
    AFRAME.registerComponent("boid-chase-cam", {
      schema: {
        enabled: { type: "boolean", default: false },
        distance: { type: "number", default: 5.0 }, // behind target
        height: { type: "number", default: 1.6 }, // above target
        stiffness: { type: "number", default: 0.12 }, // lerp factor per frame
        lookAhead: { type: "number", default: 1.2 }, // look-ahead along velocity
      },
      init() {
        this.target = null;
        this._tmpPos = new THREE.Vector3();
        this._tmpDir = new THREE.Vector3();
        this._up = new THREE.Vector3(0, 1, 0);
        this._lastTargetPos = new THREE.Vector3();
      },
      setTarget(el) {
        this.target = el || null;
        this.data.enabled = !!el;
        if (el) {
          // Start near the desired spot immediately
          const t = el.object3D;
          const v = el.components.boid?.velocity || this._tmpDir.set(0, 0, 1);
          const dir = v.lengthSq() > 1e-6 ? v.clone().normalize() : t.getWorldDirection(new THREE.Vector3());
          const desired = t
            .getWorldPosition(new THREE.Vector3())
            .clone()
            .addScaledVector(dir, -this.data.distance)
            .addScaledVector(this._up, this.data.height);
          this.el.object3D.position.copy(desired);
        }
      },
      clearTarget() {
        this.setTarget(null);
      },
      tick(time, dtMs) {
        if (!this.data.enabled || !this.target) return;
        const dt = Math.min(dtMs / 1000, 0.033);
        const cam = this.el.object3D;
        const tObj = this.target.object3D;

        // Direction preference: boid velocity if available, else forward
        const vel = this.target.components.boid?.velocity;
        const dir = vel && vel.lengthSq() > 1e-6 ? this._tmpDir.copy(vel).normalize() : tObj.getWorldDirection(this._tmpDir).normalize();

        const tPos = tObj.getWorldPosition(this._tmpPos);
        const desired = tPos.clone().addScaledVector(dir, -this.data.distance).addScaledVector(this._up, this.data.height);

        // Smoothly move camera
        cam.position.lerp(desired, 1.0 - Math.pow(1.0 - this.data.stiffness, Math.max(1, dt * 60)));

        // Look slightly ahead of target
        const lookAt = tPos.clone().addScaledVector(dir, this.data.lookAhead);
        cam.lookAt(lookAt);
      },
    });
  }

  // --- UPDATED: boid-world with Q to toggle follow random ---
  if (!AFRAME.components["boid-world"]) {
    AFRAME.registerComponent("boid-world", {
      init() {
        this.entities = [];
        this.isFlocking = true;
        this.savedStates = new Map();
        this.selectionIndex = -1;
        this.hovertarget = null;

        // Cache camera + chase component
        this.camEl = document.querySelector("#cam");
        this.chase = this.camEl?.components["boid-chase-cam"];

        window.addEventListener("keydown", (e) => {
          if (e.code === "Space") {
            e.preventDefault();
            this.toggleFlocking();
          } else if (e.code === "ArrowRight") {
            this.cycleSelection(1);
          } else if (e.code === "ArrowLeft") {
            this.cycleSelection(-1);
          } else if (e.code === "KeyQ") {
            e.preventDefault();
            this.toggleFollowRandom();
          }
        });
      },

      // Press Q: follow a random boid; press Q again: release
      toggleFollowRandom() {
        if (!this.camEl) return;
        // Ensure component exists (in case attribute wasn't set)
        if (!this.chase) {
          this.camEl.setAttribute("boid-chase-cam", "");
          this.chase = this.camEl.components["boid-chase-cam"];
        }
        if (this.chase.data.enabled) {
          // Release
          this.chase.clearTarget();
          return;
        }
        if (this.entities.length === 0) return;

        // If on ground, take off so following looks good
        if (!this.isFlocking) this.toggleFlocking();

        // Pick a random airborne boid
        let target = null;
        for (let tries = 0; tries < 10; tries++) {
          const cand = this.entities[(Math.random() * this.entities.length) | 0];
          if (cand?.components?.boid && !cand.components.boid.data.ground) {
            target = cand;
            break;
          }
        }
        target = target || this.entities[0];
        this.chase.setTarget(target);
      },

      toggleFlocking() {
        this.isFlocking = !this.isFlocking;
        const THREE = window.THREE;

        if (this.isFlocking) {
          this.entities.forEach((e) => {
            const b = e.components.boid;
            if (!b) return;
            b.data.ground = false;
            b.velocity.y += THREE.MathUtils.randFloat(0.8, 1.7);
          });
          if (this.hovertarget) this.clearHovered(this.hovertarget);
        } else {
          // If we land while following, release camera follow
          if (this.chase?.data.enabled) this.chase.clearTarget();

          if (this.savedStates.size === 0) {
            const R = 18;
            this.entities.forEach((e) => {
              const minY = e.components.boid?.data?.minAltitude ?? 0.5;
              this.savedStates.set(e, {
                pos: new THREE.Vector3(THREE.MathUtils.randFloatSpread(R * 2), minY, THREE.MathUtils.randFloatSpread(R * 2)),
                vel: new THREE.Vector3(),
              });
            });
          }
          this.entities.forEach((e) => {
            const s = this.savedStates.get(e);
            if (!s) return;
            e.object3D.position.copy(s.pos);
            const b = e.components.boid;
            if (b) {
              b.velocity.copy(s.vel);
              b.data.ground = true;
            }
          });
        }
      },

      setHovered(ent) {
        if (this.isFlocking) return;
        this.hovertarget = ent;
        this.selectionIndex = this.entities.indexOf(ent);
        this.entities.forEach((e) => {
          if (e === ent) return;
          e.components.boid?.attendTo(ent.object3D.position);
        });
      },
      clearHovered(ent) {
        if (this.isFlocking) return;
        if (this.hovertarget === ent) {
          this.hovertarget = null;
          this.entities.forEach((e) => e.components.boid?.clearAttention());
        }
      },
      cycleSelection(dir) {
        if (this.entities.length === 0 || this.isFlocking) return;
        if (this.selectionIndex >= 0) {
          const prev = this.entities[this.selectionIndex];
          prev && this.clearHovered(prev);
        }
        if (this.selectionIndex < 0) this.selectionIndex = 0;
        else this.selectionIndex = (this.selectionIndex + dir + this.entities.length) % this.entities.length;
        const ent = this.entities[this.selectionIndex];
        if (ent) this.setHovered(ent);
      },
    });
  }

  if (!AFRAME.components["boid-world"]) {
    AFRAME.registerComponent("boid-world", {
      init() {
        this.entities = [];
        this.isFlocking = true;
        this.savedStates = new Map();
        this.selectionIndex = -1;
        this.hovertarget = null;

        // Cache camera + chase component
        this.camEl = document.querySelector("#cam");
        this.chase = this.camEl?.components["boid-chase-cam"];

        window.addEventListener("keydown", (e) => {
          if (e.code === "Space") {
            e.preventDefault();
            this.toggleFlocking();
          } else if (e.code === "ArrowRight") {
            this.cycleSelection(1);
          } else if (e.code === "ArrowLeft") {
            this.cycleSelection(-1);
          } else if (e.code === "KeyQ") {
            e.preventDefault();
            this.toggleFollowRandom();
          }
        });
      },

      // Press Q: follow a random boid; press Q again: release
      toggleFollowRandom() {
        if (!this.camEl) return;
        // Ensure component exists (in case attribute wasn't set)
        if (!this.chase) {
          this.camEl.setAttribute("boid-chase-cam", "");
          this.chase = this.camEl.components["boid-chase-cam"];
        }
        if (this.chase.data.enabled) {
          // Release
          this.chase.clearTarget();
          return;
        }
        if (this.entities.length === 0) return;

        // If on ground, take off so following looks good
        if (!this.isFlocking) this.toggleFlocking();

        // Pick a random airborne boid
        let target = null;
        for (let tries = 0; tries < 10; tries++) {
          const cand = this.entities[(Math.random() * this.entities.length) | 0];
          if (cand?.components?.boid && !cand.components.boid.data.ground) {
            target = cand;
            break;
          }
        }
        target = target || this.entities[0];
        this.chase.setTarget(target);
      },

      toggleFlocking() {
        this.isFlocking = !this.isFlocking;
        const THREE = window.THREE;

        if (this.isFlocking) {
          this.entities.forEach((e) => {
            const b = e.components.boid;
            if (!b) return;
            b.data.ground = false;
            b.velocity.y += THREE.MathUtils.randFloat(0.8, 1.7);
          });
          if (this.hovertarget) this.clearHovered(this.hovertarget);
        } else {
          // If we land while following, release camera follow
          if (this.chase?.data.enabled) this.chase.clearTarget();

          if (this.savedStates.size === 0) {
            const R = 18;
            this.entities.forEach((e) => {
              const minY = e.components.boid?.data?.minAltitude ?? 0.5;
              this.savedStates.set(e, {
                pos: new THREE.Vector3(THREE.MathUtils.randFloatSpread(R * 2), minY, THREE.MathUtils.randFloatSpread(R * 2)),
                vel: new THREE.Vector3(),
              });
            });
          }
          this.entities.forEach((e) => {
            const s = this.savedStates.get(e);
            if (!s) return;
            e.object3D.position.copy(s.pos);
            const b = e.components.boid;
            if (b) {
              b.velocity.copy(s.vel);
              b.data.ground = true;
            }
          });
        }
      },

      setHovered(ent) {
        if (this.isFlocking) return;
        this.hovertarget = ent;
        this.selectionIndex = this.entities.indexOf(ent);
        this.entities.forEach((e) => {
          if (e === ent) return;
          e.components.boid?.attendTo(ent.object3D.position);
        });
      },
      clearHovered(ent) {
        if (this.isFlocking) return;
        if (this.hovertarget === ent) {
          this.hovertarget = null;
          this.entities.forEach((e) => e.components.boid?.clearAttention());
        }
      },
      cycleSelection(dir) {
        if (this.entities.length === 0 || this.isFlocking) return;
        if (this.selectionIndex >= 0) {
          const prev = this.entities[this.selectionIndex];
          prev && this.clearHovered(prev);
        }
        if (this.selectionIndex < 0) this.selectionIndex = 0;
        else this.selectionIndex = (this.selectionIndex + dir + this.entities.length) % this.entities.length;
        const ent = this.entities[this.selectionIndex];
        if (ent) this.setHovered(ent);
      },
    });
  }
}
