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
      }, 400); //Piscar mais devagar
    }
  }

  typeText();
});

//Fim Preloader




// Menu Scrool Link
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
// Fim menu Scrool Link





//Enviar mensagem (Contato)

  document.getElementById("contactForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const message = document.getElementById("successMessage");
    message.classList.remove("hidden");

    this.submit(); //Envia o formulário via iframe invisível
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
//  Fim animação dos Circulos



  
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

// Fim animação certificados


// Arrastar os Cards de Certificados
cards.forEach((card) => {
  let isDragging = false;
  let offsetX, offsetY;

  const onPointerDown = (e) => {
    isDragging = true;
    const rect = card.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    card.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;

    const areaRect = area.getBoundingClientRect();
    let x = e.clientX - areaRect.left - offsetX;
    let y = e.clientY - areaRect.top - offsetY;

    const maxX = area.clientWidth - card.offsetWidth;
    const maxY = area.clientHeight - card.offsetHeight;

    x = Math.max(0, Math.min(x, maxX));
    y = Math.max(0, Math.min(y, maxY));

    card.style.left = `${x}px`;
    card.style.top = `${y}px`;
  };

  const onPointerUp = () => {
    isDragging = false;
  };

  card.addEventListener("pointerdown", onPointerDown);
  card.addEventListener("pointermove", onPointerMove);
  card.addEventListener("pointerup", onPointerUp);
});


// Fim de Arrastar os Cards de Certificados

  //  Reinicia o efeito de digitação do "Hello World !" a cada 8 segundos
setInterval(() => {
  const typeElement = document.querySelector('.typewriter');

  typeElement.classList.remove('typewriter');

  // Força o reflow para reiniciar a animação
  void typeElement.offsetWidth;

  typeElement.classList.add('typewriter');
}, 8000);





  // Botão Menu Mobile
  
  const toggle = document.getElementById('menu-toggle');
  const menu = document.getElementById('menu');

  toggle.addEventListener('click', () => {
    menu.classList.toggle('show');
  });

