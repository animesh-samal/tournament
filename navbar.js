// Handle navbar menu toggle
function initializeNavbar() {
  const toggle = document.querySelector('.navbar-toggle');
  const links = document.querySelector('.navbar-links');
  if (toggle && links) {
    // Toggle menu when hamburger is clicked
    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      links.classList.toggle('open');
      toggle.classList.toggle('open');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      if (!toggle.contains(e.target) && !links.contains(e.target)) {
        links.classList.remove('open');
        toggle.classList.remove('open');
      }
    });

    // Handle link clicks
    links.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', (e) => {
        // Only prevent default for hash links (#)
        if (link.getAttribute('href').startsWith('#')) {
          e.preventDefault();
        }
        links.classList.remove('open');
        toggle.classList.remove('open');
      });
    });
  }
}

// Initialize navbar when the DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeNavbar);
} else {
  initializeNavbar();
}

// Re-initialize navbar when it's dynamically loaded
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length) {
      mutation.addedNodes.forEach((node) => {
        if (node.classList && node.classList.contains('main-navbar')) {
          initializeNavbar();
        }
      });
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});