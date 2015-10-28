autosize(document.querySelectorAll('textarea'));

$(document).ready(function () {
  var $eventGroups = $('.event-group')
  var saveHover = false

  function toggleGroup (e) {
    var $this = $(this)
    var $parent = $this.parent()
    var $fields = $parent.find('[name]')
    var toggleClass = 'event-group--toggle-placeholder'

    if ($parent.hasClass(toggleClass)) {
      $parent.removeClass(toggleClass)
    } else {
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
      })
    }
  }

  function hideGroup (e) {
    var $this = $(this)
    var $parent = $(this).parent()
    var toggleClass = 'event-group--toggle-placeholder'

    if ($parent.hasClass(toggleClass) && !saveHover) {
      $parent.removeClass(toggleClass)
    }
  }

  function saveData (e) {
    var $this = $(this)
    var $parent = $this.parents('.event-group')
    var $placeholder = $parent.find('.event-placeholder')
    var $field = $($parent.find('[name]')[0])
    var toggleClass = 'event-group--toggle-placeholder'

    $placeholder.html(marked($field.val()))

    if ($parent.hasClass(toggleClass)) {
      $parent.removeClass(toggleClass)
    }
  }

  $eventGroups.each(function (i, group) {
    var $group = $(group)
    var $fields = $group.find('[name]')
  
    $fields.each(function (i, field) {
      $(field).blur(hideGroup)
    })
  })

  function preventBlur (e) {
    saveHover = true
  }

  function unpreventBlur (e) {
    saveHover = false
  }

  function parseDescription () {
    var $eventDescription = $('.event-description')
    var $placeholder = $eventDescription.find('.event-placeholder')
    var description = $eventDescription.find('textarea').val()

    $placeholder.html(marked(description))
  }

  parseDescription()

  $('body').on('click', '.event-placeholder', toggleGroup);
  $('body').on('click', '.event-save', saveData);
  $('body').on('mouseover', '.event-save', preventBlur);
  $('body').on('mouseout', '.event-save', unpreventBlur);
})
