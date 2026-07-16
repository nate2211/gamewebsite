import * as THREE from "three";

export const PARTICLE_GRAVITY = -18;

export function createParticleVelocity(index, intensity = 1) {
  const angle = (index / 12) * Math.PI * 2 + Math.random() * 0.45;
  const horizontal = (1.4 + Math.random() * 2.2) * intensity;
  return new THREE.Vector3(
    Math.cos(angle) * horizontal,
    (2.4 + Math.random() * 3.8) * intensity,
    Math.sin(angle) * horizontal
  );
}

export function integrateParticle(body, delta, floorY) {
  body.velocity.y += PARTICLE_GRAVITY * delta;
  body.position.addScaledVector(body.velocity, delta);
  body.rotation.x += body.spin.x * delta;
  body.rotation.y += body.spin.y * delta;
  body.rotation.z += body.spin.z * delta;

  if (body.position.y < floorY) {
    body.position.y = floorY;
    if (Math.abs(body.velocity.y) > 0.45) {
      body.velocity.y *= -0.28;
      body.velocity.x *= 0.72;
      body.velocity.z *= 0.72;
    } else {
      body.velocity.set(0, 0, 0);
    }
  }
}
