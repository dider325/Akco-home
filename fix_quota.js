try {
  const keys = ['akco_db_site_content', 'akco_site_content_cache', 'akco_db_projects'];
  keys.forEach(key => {
    const raw = localStorage.getItem(key);
    if (raw && raw.length > 500000) { // If larger than ~500KB
      let parsed = JSON.parse(raw);
      let changed = false;
      const cleanImg = (obj) => {
        if (obj.imageUrl && obj.imageUrl.length > 500000) {
          obj.imageUrl = '';
          changed = true;
        }
        if (obj.featuredImage && obj.featuredImage.length > 500000) {
          obj.featuredImage = '';
          changed = true;
        }
        if (obj.images && Array.isArray(obj.images)) {
          for (let i = 0; i < obj.images.length; i++) {
            if (obj.images[i].length > 500000) {
              obj.images[i] = '';
              changed = true;
            }
          }
        }
      };
      if (Array.isArray(parsed)) parsed.forEach(cleanImg);
      else if (typeof parsed === 'object') Object.values(parsed).forEach(cleanImg);
      if (changed) localStorage.setItem(key, JSON.stringify(parsed));
    }
  });
} catch(e) {}
