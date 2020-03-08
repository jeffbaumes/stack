import SimplexNoise from 'simplex-noise';

const simplex = new SimplexNoise();

export default function turbulence2D(x, y, oct, ampscale = 0.5, freqscale = 2.0) {
  let amp = 1;
  let out = (0.5 + 0.5 * simplex.noise2D(x, y));
  for (let i = 1; i < oct; i += 1) {
    amp *= ampscale;
    x *= freqscale;
    y *= freqscale;
    out += amp * (0.5 + 0.5 * simplex.noise2D(x, y));
  }
  return out;
}

// function turbulence(x, y, z, oct, ampscale = 0.5, freqscale = 2.0) {
//   let amp, out, t;
//   let i;
//   amp = 1.;
//   out = 2.0 * simplex.noise3D(x, y, z) - 1.0;
//   // if (hard) {
//   //   out = Math.abs(out);
//   // }
//   for (i = 1; i < oct; i++) {
//     amp *= ampscale;
//     x *= freqscale;
//     y *= freqscale;
//     z *= freqscale;
//     t = amp * (2.0 * simplex.noise3D(x, y, z) - 1.0);
//     // if (hard) {
//     //   t = Math.abs(t);
//     // }
//     out += t;
//   }
//   return out;
// }

// // Planet Noise by: Farsthary
// // https://farsthary.wordpress.com/2010/11/24/new-planet-procedural-texture/
// export function planetNoise({
//   coords, oct = 6, nabla = 0.001,
// }) {
//   let [x, y, z] = coords;
//   const d = 0.001;
//   const offset = nabla * 1000;
//   x = turbulence(x, y, z, oct);
//   y = turbulence(x + offset, y, z, oct);
//   z = turbulence(x, y + offset, z, oct);
//   const xdy = x - turbulence(x, y + d, z, oct);
//   const xdz = x - turbulence(x, y, z + d, oct);
//   const ydx = y - turbulence(x + d, y, z, oct);
//   const ydz = y - turbulence(x, y, z + d, oct);
//   const zdx = z - turbulence(x + d, y, z, oct);
//   const zdy = z - turbulence(x, y + d, z, oct);
//   return [(zdy - ydz), (zdx - xdz), (ydx - xdy)]
// }
