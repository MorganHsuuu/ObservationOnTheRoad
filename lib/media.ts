type ImageSource = {
  image_urls: string[];
  thumb_urls: string[];
};

export function sharpImage(item: ImageSource) {
  return item.image_urls[0] || item.thumb_urls[0] || "";
}

export function tinyImage(item: ImageSource) {
  return item.thumb_urls[0] || item.image_urls[0] || "";
}

export function photoSlots(item: ImageSource) {
  return (item.image_urls ?? []).filter(Boolean).map((full, index) => ({
    full,
    thumb: item.thumb_urls?.[index] || full,
  }));
}
