document.addEventListener('DOMContentLoaded', function () {
  const toggles = document.querySelectorAll('.nav-item.dropdown > .nav-link');

  toggles.forEach((toggle) => {
    const parent = toggle.parentElement;
    const menu = parent.querySelector('.dropdown-menu');
    const icon = toggle.querySelector('.fa-angle-down');

    function openDropdown() {
      parent.classList.add('show');
      if (menu) menu.classList.add('show');
      toggle.setAttribute('aria-expanded', 'true');
      if (icon) icon.style.transform = 'rotate(180deg)';
      toggle.style.color = '#d19c97';
    }

    function closeDropdown() {
      parent.classList.remove('show');
      if (menu) menu.classList.remove('show');
      toggle.setAttribute('aria-expanded', 'false');
      if (icon) icon.style.transform = 'rotate(0deg)';
      toggle.style.color = '';
    }

    toggle.addEventListener(
      'click',
      function (e) {
        if (toggle.getAttribute('href') === '#') e.preventDefault();
        e.stopPropagation();

        if (!parent.classList.contains('show')) openDropdown();
        else closeDropdown();
      },
      { passive: false },
    );

    document.addEventListener('click', function (e) {
      if (!parent.contains(e.target)) closeDropdown();
    });

    try {
      const hoverSupported = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      if (hoverSupported) {
        parent.addEventListener('mouseenter', openDropdown);
        parent.addEventListener('mouseleave', closeDropdown);
      }
    } catch (err) {}

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && parent.classList.contains('show')) {
        closeDropdown();
      }
    });
  });
});
