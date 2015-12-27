(function(window, document, $, undefined) {

  'use strict';

  // Variables
  var $trigger  = $('.js-trigger');
  var $count    = $('.js-count');
  var $div      = $('.site-footer__meta');

  var menu      = '.js-menu';
  var footer    = '.js-footer';
  var toggleBtn = 'site-footer__count--toggle'

  // Counter
  var $chars    = $('.counter__chars');
  var $words    = $('.counter__words');
  var $lines    = $('.counter__lines');

  // Toggle info box
  function menuBox() {
    $(menu).slideToggle();
  }

  function toggleFooter() {
    $(footer).slideToggle();
  }

  var counter = function() {
      var value = $('textarea').val();

      if (value.length == 0) {
          $chars.html(0);
          $words.html(0);
          $lines.html(0);
          return;
      }

      var regex = /\s+/gi;
      var wordCount = value.trim().replace(regex, ' ').split(' ').length;
      var charCount = value.trim().length;
      var lineCount = value.split(/\r*\n/).length

      $words.html(wordCount);
      $chars.html(charCount);
      $lines.html(lineCount);
  };

  $(document).ready(function() {
    $('.counter').click(counter);
    $('textarea').change(counter);
    $('textarea').keydown(counter);
    $('textarea').keypress(counter);
    $('textarea').keyup(counter);
    $('textarea').blur(counter);
    $('textarea').focus(counter);
  });

  $trigger.on('click', function() {
    menuBox();
  });

  $count.on('click', function() {
    $(this).toggleClass(toggleBtn);
    toggleFooter();
  });

  $(window).resize(function () {
    if ($(window).width() > 688) {
        $(footer).show();
    }

    if ($(window).width() < 687) {
        $(footer).hide();
    }
  });

  $('.spin').show().delay(800).fadeOut();

  $('.btn--save').on('click', function () {
    $('.msg').slideDown();
  });

  $('.msg__close').on('click', function () {
    $('.msg').slideUp();
  });

})(window, document, jQuery);
