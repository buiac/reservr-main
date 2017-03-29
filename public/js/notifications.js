( function( document ) {
    var button = document.querySelector( "a.notifications" );

    var toggleNotificationsMenu = function ( evt ) {
        evt.preventDefault()
        button.parentNode.classList.toggle( 'notifications-open' );
    };

    button.addEventListener( "click", toggleNotificationsMenu )
} )( document );
