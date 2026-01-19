(function ($) {
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (canHover) {
    $('#catalogoDropdown').on('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
    });

    $('.nav-item.dropdown')
      .on('mouseenter', function () {
        $(this).addClass('show');
        $(this).find('.dropdown-menu').addClass('show');
      })
      .on('mouseleave', function () {
        $(this).removeClass('show');
        $(this).find('.dropdown-menu').removeClass('show');
      });

    $(document).on('click.bs.dropdown', function (e) {
      if (canHover) {
        e.stopPropagation();
      }
    });
  } else {
  }
})(jQuery);
