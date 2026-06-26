// @ts-ignore
import jsmediatags from 'jsmediatags/dist/jsmediatags.min.js';

export interface ExtractedTags {
  title?: string;
  artist?: string;
  album?: string;
  pictureUrl?: string; // object URL
}

export function extractTags(file: File): Promise<ExtractedTags> {
  return new Promise((resolve) => {
    const reader = jsmediatags || (window as any).jsmediatags;
    if (!reader) {
      console.warn("jsmediatags not loaded properly");
      return resolve({});
    }
    
    reader.read(file, {
      onSuccess: function(tag: any) {
        const result: ExtractedTags = {};
        
        if (tag.tags.title) result.title = tag.tags.title;
        if (tag.tags.artist) result.artist = tag.tags.artist;
        if (tag.tags.album) result.album = tag.tags.album;
        
        const picture = tag.tags.picture;
        if (picture) {
          try {
            let base64String = "";
            for (let i = 0; i < picture.data.length; i++) {
              base64String += String.fromCharCode(picture.data[i]);
            }
            const base64 = btoa(base64String);
            const dataUrl = `data:${picture.format};base64,${base64}`;
            
            // Convert to Blob to get an object URL (more efficient than large base64 strings)
            fetch(dataUrl)
              .then(res => res.blob())
              .then(blob => {
                result.pictureUrl = URL.createObjectURL(blob);
                resolve(result);
              })
              .catch(() => resolve(result)); // fallback if fetch fails
            return;
          } catch (e) {
            console.error("Failed to parse picture", e);
          }
        }
        
        resolve(result);
      },
      onError: function(error: any) {
        console.warn('jsmediatags error:', error);
        resolve({}); // return empty on error
      }
    });
  });
}
