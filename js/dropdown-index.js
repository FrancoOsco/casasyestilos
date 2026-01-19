document.addEventListener('DOMContentLoaded', function () {
  const toggleBtn = document.querySelector('[data-toggle="collapse"][href="#navbar-vertical"]');
  if (!toggleBtn) return;

  const arrow = toggleBtn.querySelector('i.fa-angle-down');
  const collapse = document.getElementById('navbar-vertical');
  if (!arrow || !collapse) return;

  if (collapse.classList.contains('show')) {
    arrow.classList.add('rotate');
  }

  toggleBtn.addEventListener('click', function () {
    setTimeout(() => {
      if (collapse.classList.contains('show')) {
        arrow.classList.add('rotate');
      } else {
        arrow.classList.remove('rotate');
      }
    }, 10); 
  });
});
