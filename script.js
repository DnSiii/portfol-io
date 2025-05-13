// script.js

// Pre loader
document.addEventListener("DOMContentLoaded", function () {
  const textElement = document.getElementById("typed-text");
  const cursor = document.getElementById("cursor");
  const preloader = document.getElementById("preloader");

  const text = "Hello World !";
  let index = 0;

  function typeText() {
    if (index < text.length) {
      textElement.textContent += text.charAt(index);
      index++;
      setTimeout(typeText, 100); // Velocidade da digitação
    } else {
      let blinkCount = 0;
      const maxBlinks = 5; // 2 piscadas completas

      const interval = setInterval(() => {
        cursor.style.visibility = cursor.style.visibility === "visible" ? "hidden" : "visible";
        blinkCount++;

        if (blinkCount >= maxBlinks) {
          clearInterval(interval);
          preloader.style.opacity = "0";
          setTimeout(() => {
            preloader.style.display = "none";
          }, 1000);
        }
      }, 400); // Piscar mais devagar
    }
  }

  typeText();
});


// Fim Preloader




// Menu 
console.log("JavaScript carregado!");
document.addEventListener('DOMContentLoaded', function () {
  const menuLinks = document.querySelectorAll('.menu a');

  menuLinks.forEach(link => {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      const targetId = this.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        const yOffset = -80; // altura da navbar (ajuste se necessário)
        const y = targetElement.getBoundingClientRect().top + window.pageYOffset + yOffset;

        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    });
  });
});



// Fim menu





// Enviar mensagem (Contato)


  document.getElementById("contactForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const message = document.getElementById("successMessage");
    message.classList.remove("hidden");

    this.submit(); // envia o formulário via iframe invisível
    this.reset();

    setTimeout(() => {
      message.classList.add("hidden");
    }, 4000);
  });

// Final Contato







  // Circulo animação

  function animateCircle(circle, targetPercent) {
    let current = 0;
    const speed = 2; // mais alto = mais rápido
  
    const animate = () => {
      if (current <= targetPercent) {
        circle.style.background = `conic-gradient(#1e40af ${current}%, #333 ${current}%)`;
        current += speed;
        requestAnimationFrame(animate);
      }
    };
  
    animate();
  }
  
  // Anima o circulo ao carregar a página
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('.circle').forEach(circle => {
      const percent = parseInt(circle.style.getPropertyValue('--percent'));
      animateCircle(circle, percent);
    });
  });
  
  // Anima o circulo ao passar o mouse
  document.querySelectorAll('.circle').forEach(circle => {
    const percent = parseInt(circle.style.getPropertyValue('--percent'));
  
    circle.addEventListener('mouseenter', () => {
      animateCircle(circle, percent);
    });
  });








  
  // Animação dos Certificados



  const area = document.querySelector('.certificados-area');
  const cards = document.querySelectorAll('.certificado-card');

  const velocities = [];
  const pausedCards = new Set();

  cards.forEach((card, index) => {
    const cardWidth = card.offsetWidth;
    const cardHeight = card.offsetHeight;

    const maxX = area.clientWidth - cardWidth;
    const maxY = area.clientHeight - cardHeight;

    card.style.left = `${Math.random() * maxX}px`;
    card.style.top = `${Math.random() * maxY}px`;

    velocities[index] = {
      dx: (Math.random() * 0.8 + 0.5) * (Math.random() < 0.1 ? 1 : -1),
      dy: (Math.random() * 0.8 + 0.5) * (Math.random() < 0.1 ? 1 : -1)
    };

    card.addEventListener('mouseenter', () => {
      pausedCards.add(index);
    });

    card.addEventListener('mouseleave', () => {
      pausedCards.delete(index);
    });
  });

  function animateCards() {
    cards.forEach((card, index) => {
      if (pausedCards.has(index)) return;

      const velocity = velocities[index];
      const cardWidth = card.offsetWidth;
      const cardHeight = card.offsetHeight;

      let x = parseFloat(card.style.left);
      let y = parseFloat(card.style.top);

      x += velocity.dx;
      y += velocity.dy;

      const maxX = area.clientWidth - cardWidth;
      const maxY = area.clientHeight - cardHeight;

      if (x <= 0 || x >= maxX) velocity.dx *= -1;
      if (y <= 0 || y >= maxY) velocity.dy *= -1;

      card.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
      card.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
    });

    requestAnimationFrame(animateCards);
  }

  animateCards();




  // Reinicia o efeito de digitação do "Hello World !" a cada 8 segundos
setInterval(() => {
  const typeElement = document.querySelector('.typewriter');

  typeElement.classList.remove('typewriter');

  // Força o reflow para reiniciar a animação
  void typeElement.offsetWidth;

  typeElement.classList.add('typewriter');
}, 8000);

  