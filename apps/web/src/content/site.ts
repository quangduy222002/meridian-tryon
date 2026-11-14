import type { ImageMetadata } from 'astro';
import watchImg from '../assets/projects/watch.jpg';
import chairImg from '../assets/projects/chair.jpg';
import boxImg from '../assets/projects/box.jpg';
import storeImg from '../assets/projects/store.jpg';
import assemblyImg from '../assets/projects/assembly.jpg';

export const UPWORK_URL = 'https://www.upwork.com/freelancers/~0199cc702afa884c91';

export interface Project {
  id: string;
  /** Camera shot in the room (see scripts/home/room/shots.ts). */
  shot: string;
  /** Side of the screen the panel sits on; the 3D subject is framed on the other side. */
  side: 'left' | 'right';
  kind: string;
  title: string;
  sub: string;
  desc: string;
  chips: string[];
  image?: ImageMetadata;
  imageAlt?: string;
  /** Path relative to the site base. */
  href?: string;
  cta?: string;
  live?: string;
  extra?: { title: string; desc: string; chips: string[] };
  note?: string;
}

export const projects: Project[] = [
  {
    id: 'work-watch',
    shot: 'watch',
    side: 'left',
    kind: '3D product story',
    title: 'Meridian Halo',
    sub: 'A watch that tells its own story',
    desc: 'A guilloché dial under studio light, brushed titanium, an exploded view with labelled parts, a ticking movement, lume that glows when the lights go out — and a live configurator at the end.',
    chips: ['Three.js', 'Procedural materials', 'Scroll choreography', 'Configurator'],
    image: watchImg,
    imageAlt: 'Meridian Halo 3D watch product story',
    href: 'watch/',
    cta: 'Open demo',
    live: 'Live demo',
  },
  {
    id: 'work-chair',
    shot: 'chair',
    side: 'right',
    kind: 'Configurator',
    title: 'Norda',
    sub: 'Furniture, configured live',
    desc: 'Real wood grain, woven linen, velvet and pebbled leather on a piped, buttoned lounge chair — with camera presets, material call-outs and a room view to answer "will it match my room?" before anyone asks.',
    chips: ['Procedural textures', 'Studio & room', 'Live pricing', 'Render on demand'],
    image: chairImg,
    imageAlt: 'Norda 3D chair configurator',
    href: 'chair/',
    cta: 'Open demo',
    live: 'Live demo',
  },
  {
    id: 'work-box',
    shot: 'box',
    side: 'left',
    kind: 'B2B tool',
    title: 'Pakka',
    sub: 'Custom box studio',
    desc: 'Set the size, upload a logo and watch corrugated board fold into a box. Flip to a print-ready dieline with dimensions, or see the whole order stacked on pallets — with an instant volume quote.',
    chips: ['Folding animation', 'Dieline', 'Pallet view', 'Quote engine'],
    image: boxImg,
    imageAlt: 'Pakka custom packaging box studio',
    href: 'box/',
    cta: 'Open demo',
    live: 'Live demo',
  },
  {
    id: 'work-store',
    shot: 'store',
    side: 'right',
    kind: 'Headless Shopify',
    title: 'Halde',
    sub: 'A storefront you can spin',
    desc: "A custom React storefront on Shopify's Storefront API: a 3D fabric lookbook, a garment that re-dyes as you scroll and a 3D cap studio with embroidery — on top of a full cart and Shopify checkout.",
    chips: ['React', 'Hydrogen React', 'Three.js', 'Storefront API'],
    image: storeImg,
    imageAlt: 'Halde headless Shopify storefront',
    href: 'store/',
    cta: 'Open store',
    live: 'Live store',
  },
  {
    id: 'work-client',
    shot: 'client',
    side: 'left',
    kind: 'Client work',
    title: 'Engineering viewers',
    sub: 'Ships & offshore, in a browser tab',
    desc: '3D/2D viewers for large ship and offshore models: heavy model streaming, measuring, section cuts, exploded views and linked 2D drawings — built for engineers.',
    chips: ['Three.js', 'CesiumJS', 'TypeScript'],
    extra: {
      title: 'Synode.ai — 3D configurator SaaS',
      desc: 'A commercial Three.js configurator merchants embed in their store, with Shopify, WooCommerce and Stripe integrations. Built full-stack and shipped to real customers.',
      chips: ['Nuxt.js', 'NestJS', 'Shopify', 'Stripe'],
    },
    note: 'Private client work — walkthrough on request',
  },
  {
    id: 'work-assembly',
    shot: 'assembly',
    side: 'right',
    kind: '3D instructions',
    title: 'Forge',
    sub: 'Assembly manuals, in 3D',
    desc: 'A paper manual turned into a 3D build guide: each part of a gaming PC flies into place step by step, with tools, warnings, x-ray and a parts list. A built-in studio lets anyone author their own guide — pick parts, drag where they come from, set the camera.',
    chips: ['Step timeline', 'Authoring studio', 'X-ray shader', 'Built in code'],
    image: assemblyImg,
    imageAlt: 'Forge 3D PC build guide with step card and timeline',
    href: 'assembly/',
    cta: 'Open demo',
    live: 'Live demo',
  },
];

export const services = [
  {
    title: 'Product configurators',
    body: 'Colors, materials, sizes and add-ons with live price — connected to Shopify, WooCommerce or your own cart.',
  },
  {
    title: 'Shaders & materials',
    body: 'Custom GLSL, procedural textures and studio lighting that make metal, glass and fabric look real — without heavy 3D files.',
  },
  {
    title: '3D landing pages',
    body: 'Scroll-driven product stories and interactive hero sections — like this one — that stay smooth on mid-range phones.',
  },
  {
    title: 'Model viewers',
    body: 'Load GLB/GLTF, CAD exports or point data; measure, section, annotate and share — for products or engineering.',
  },
  {
    title: 'Full-stack around 3D',
    body: 'React or Vue front ends, Node.js/NestJS APIs, PostgreSQL, auth, admin panels and deployment with Docker.',
  },
  {
    title: 'Optimization & rescue',
    body: 'Slow or broken Three.js scene? I compress models, cut draw calls and fix the bugs so it runs everywhere.',
  },
];

export const steps = [
  {
    title: 'Share what you have',
    body: 'Photos, 3D files, a competitor link or just an idea. I suggest the simplest path.',
  },
  {
    title: 'Quick prototype',
    body: 'A clickable first version in days, so you can feel it before committing to everything.',
  },
  { title: 'Build & iterate', body: 'Regular demo links to test on your own devices. Feedback goes straight in.' },
  { title: 'Launch & hand over', body: 'Optimized, documented, deployed — and easy for your team to update.' },
];

export const stack = [
  'Three.js',
  'React Three Fiber',
  'WebGL / GLSL',
  'CesiumJS',
  'TypeScript',
  'Astro',
  'React',
  'Vue / Nuxt',
  'Node.js',
  'NestJS',
  'PostgreSQL',
  'Docker',
  'Playwright',
];
