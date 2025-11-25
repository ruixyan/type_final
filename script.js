window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const hero = document.querySelector('.hero-svg');
    const windowHeight = window.innerHeight;
  
    // fade + scale hero
    const progress = Math.min(scrollY / windowHeight, 1);
    hero.style.opacity = 1 - progress;
    hero.style.transform = `scale(${1 - progress * 0.1}) translateY(${progress * 50}px)`;
  
    // parallax for about images
    const imgs = document.querySelectorAll('#img-content img');
    imgs.forEach((img, i) => {
      const speed = 0.15 + i * 0.05; // each image moves slightly differently
      img.style.transform = `translateY(${scrollY * speed * 0.1}px)`;
    });
  });
  