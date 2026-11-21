import ImageResizer from '@bam.tech/react-native-image-resizer';

/** Resize + compress a picked image and return bytes ready for Supabase Storage. */
export async function pickedImageToBuffer(uri: string, maxSide: number, quality = 0.8) {
  const resized = await ImageResizer.createResizedImage(uri, maxSide, maxSide, 'JPEG', Math.round(quality * 100), 0, undefined, false, { mode: 'contain', onlyScaleDown: true });
  const res = await fetch(resized.uri);
  const buffer = await res.arrayBuffer();
  return { buffer, contentType: 'image/jpeg' };
}
