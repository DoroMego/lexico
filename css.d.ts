// Ambient declarations so TypeScript understands CSS imports that Metro/NativeWind
// resolve at build time (global.css side-effect import + CSS Modules).
declare module '*.css';

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
