
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface Vibe {
  id: string;
  label: string;
  thumbnailUrl: string;
  promptSuffix: string;
}

export const VIBE_OPTIONS: Vibe[] = [
  {
    id: 'studio',
    label: 'Studio Clean',
    thumbnailUrl: 'https://images.unsplash.com/photo-1585336261022-680e295ce3fe?auto=format&fit=crop&w=200&q=80',
    promptSuffix: "isolated on a pure white background, soft even softbox lighting, no harsh shadows, neutral color temperature, 4k e-commerce photography."
  },
  {
    id: 'tokyo_night',
    label: 'Tokyo Night',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=200&q=80',
    promptSuffix: "cinematic night lighting in a rainy Tokyo street, wet pavement reflections. Critical: Apply cyan rim-lighting to the left side of the subject and magenta rim-lighting to the right. High contrast, cyberpunk aesthetic."
  },
  {
    id: 'golden_hour',
    label: 'Golden Hour',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=200&q=80',
    promptSuffix: "standing on a luxury balcony overlooking the ocean during golden hour. Warm sunset backlighting (contre-jour), lens flare, soft long shadows casting forward. Hair should have a golden halo effect. Lifestyle photography."
  },
  {
    id: 'sunday_coffee',
    label: 'Sunday Coffee',
    thumbnailUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=200&q=80',
    promptSuffix: "in a blurred cozy cafe background. Soft diffused window light coming from the side, interior ambient occlusion, low contrast, creamy beige color palette. Minimalist 'Clean Girl' aesthetic."
  },
  {
    id: 'flash',
    label: 'Editorial Flash',
    thumbnailUrl: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?auto=format&fit=crop&w=200&q=80',
    promptSuffix: "High fashion paparazzi style. Direct on-camera flash styling, hard shadows behind the subject, vignette edges, high sharpness, 'Disposable Camera' aesthetic. Dark concrete or dark blue wall background."
  }
];
