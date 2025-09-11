// Utility functions for handling gig images and fallbacks

// Define default placeholder images for each category
const defaultImages = {
  'Web Development': 'default-web-dev.png',
  'Graphic Design': 'default-design.png',
  'Writing & Translation': 'default-writing.png',
  'Digital Marketing': 'default-marketing.png',
  'Video & Animation': 'default-video.png',
  'Data': 'default-data.png',
  'Music & Audio': 'default-music.png',
  'Programming & Tech': 'default-programming.png'
};

/**
 * Get the appropriate default image for a category
 * @param {string} category - The gig category
 * @returns {string} - The default image filename
 */
export const getDefaultImage = (category) => {
  return defaultImages[category] || 'default-general.png';
};

/**
 * Process gig images to ensure there's always at least one image
 * If no images are provided, returns the default image for the category
 * @param {string[]} images - Array of image filenames
 * @param {string} category - The gig category
 * @returns {string[]} - Array of image filenames with fallback
 */
export const processGigImages = (images, category) => {
  if (!images || images.length === 0) {
    return [`/default-images/${getDefaultImage(category)}`];
  }
  
  // Process each image to ensure default images have correct path
  return images.map(image => {
    if (isDefaultImage(image)) {
      return `/default-images/${image}`;
    }
    return `/uploads/gigs/${image}`;
  });
};

/**
 * Get the first image for a gig (for thumbnails, etc.)
 * @param {string[]} images - Array of image filenames
 * @param {string} category - The gig category
 * @returns {string} - The first image filename or default
 */
export const getGigThumbnail = (images, category) => {
  const processedImages = processGigImages(images, category);
  return processedImages[0];
};

/**
 * Check if an image is a default placeholder
 * @param {string} imageName - The image filename
 * @returns {boolean} - True if it's a default image
 */
export const isDefaultImage = (imageName) => {
  return imageName && imageName.startsWith('default-');
};
