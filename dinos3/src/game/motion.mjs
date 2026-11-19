// Scene coordinates: running moves the world towards +Z. A stationary feature
// therefore has the same texture coordinate at (z, travel) and (z+d, travel+d).
export const groundCoordinate = (z, travel) => z - travel;
// PlaneGeometry rotated -PI/2 has UV.v = constant - z/length.
export const groundOffset = (travel, length = 180, repeats = 24) => (travel / length) * repeats;
