autosize(document.querySelectorAll('textarea'));

$(document).ready(function () {
  var $eventGroups = $('.event-group')
  var saveHover = false
  var calendar

  function toggleGroup (e) {

    var $this = $(this)
    var $parent = $this.parent()
    var $fields = $parent.find('[name]')
    var toggleClass = 'event-group--toggle-placeholder'

    if ($parent.hasClass(toggleClass)) {
      $parent.removeClass(toggleClass)
    } else {
      if (!$parent.hasClass('event-image')) {
        $parent.addClass(toggleClass)

        // focus input
        $fields.each(function (i, field) {
          var data = $(field).val()

          $(field).focus()

          $(field).val('').val(data)

          if (field.type === 'textarea') {
            var evt = document.createEvent('Event');
            evt.initEvent('autosize:update', true, false);
            field.dispatchEvent(evt);
          }

          if ($parent.hasClass('event-date')) {
            setTimeout(function () {
              calendar.show()
            }, 10)
          }
        })
      }
    }
  }

  function hideGroup (e) {
    var $this = $(this)
    var $parent = $(this).parents('.event-group')
    var toggleClass = 'event-group--toggle-placeholder'
    var isDate = $this.parents('.event-group').hasClass('event-date')

    if ($parent.hasClass(toggleClass) && !saveHover && !isDate) {
      $parent.removeClass(toggleClass)
    }
  }

  function saveData (e) {
    var $this = $(e.target)
    var $parent = $this.parents('.event-group')
    var $placeholder = $parent.find('.event-placeholder')
    var $icon = $placeholder.find('.fa')
    var field = $parent.find('[name]')[0]
    var toggleClass = 'event-group--toggle-placeholder'
    var value = $(field).val()
    

    if (!$icon.length) {
      $icon = $placeholder.find('.icomoon')
    }

    if (value && field.type === 'textarea') {
      $placeholder.html(marked($(field).val()))
    } else {
      $placeholder.html($(field).val())
    }

    if ($parent.hasClass('event-seats')) {
      $placeholder.html($placeholder.html() + ' seats')
    }


    if ($icon) {
      $placeholder.prepend($icon)
    }
    

    if ($parent.hasClass(toggleClass)) {
      $parent.removeClass(toggleClass)
    }
  }


  function saveDataEnter (e) {
    var code = e.keyCode || e.which;
    var isDescription = $(e.target).parents('.event-group').hasClass('event-description')

    if (code === 13 && !isDescription) {
      saveData(e)
    }
  }

  $eventGroups.each(function (i, group) {
    var $group = $(group)
    var $fields = $group.find('[name]')
  
    $fields.each(function (i, field) {
      $(field).blur(hideGroup)
      $(field).keypress(saveDataEnter)
    })
  })

  function preventBlur (e) {
    saveHover = true
  }

  function unpreventBlur (e) {
    saveHover = false
  }

  function parseFields () {
    var $eventGroups = $('.rzv-lightbox .event-group')

    $eventGroups.each(function (i, eventGroup) {
      var field = $(eventGroup).find('[name]')[0]
      var $placeholder = $(eventGroup).find('.event-placeholder')
      var value = $(field).val()

      if (field.type !== 'file' && value) {
        if (field.type === 'textarea') {
          $placeholder.html(marked(value))
        } else {
          $placeholder.html(value)
        }
      }
    });
  }

  function checkImage () {
    var $eventImage = $('.event-image')
    var $preview = $eventImage.find('.event-preview')
  }

  function setupCalendar () {
    var dateElement = $('.event-date input')[0]
    calendar = rome(dateElement)
  }

  function initBootstrapWidgets (argument) {
    // Bootstrap widgets
    $('.event-free').tooltip()
  }

  function init () {
    parseFields()
    checkImage()
    setupCalendar()
    initBootstrapWidgets()
  }

  function updateEventPrice (e) {
    var $this = $(this)
    var $parent = $this.parents('.event-group')
    var $placeholder = $this.parent()
    var $icon = $placeholder.find('.fa')
    var $change = $('<a>').html('Change')

    $placeholder.html('Free Event ')
    $placeholder.prepend($icon)
    $placeholder.append($change)


    e.stopPropagation()
  }

  $('body').on('click', '.event-placeholder', toggleGroup);
  $('body').on('click', '.event-save', saveData);
  $('body').on('mouseover', '.event-save', preventBlur);
  $('body').on('mouseout', '.event-save', unpreventBlur);
  $('body').on('click', '.event-free', updateEventPrice);

  init()

})
