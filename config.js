module.exports = {

    ////////////////////////////////////////////////////////////////
    // GENERAL SETTINGS
    ////////////////////////////////////////////////////////////////

    // Data directory is used so that we can persist cookies per session and not have to
    // authorize this application every time.
    // NOTE: This directory can get quite large overtime, in that case simply delete it
    // and re-authorize Whatsapp.
    data_dir: './tmp',

    // When true, Chrome browser window will be shown. When false, it will be hidden
    window: true,


    ////////////////////////////////////////////////////////////////
    // CHAT SETTINGS
    ////////////////////////////////////////////////////////////////

    // Number of seconds to check for new messages
    check_message_interval: 5,

    // If true, colored messages will be shown
    colors: true,

    ////////////////////////////////////////////////////////////////
    // CHAT NOTIFICATION SETTINGS
    ////////////////////////////////////////////////////////////////

    // Enable or disable desktop notifications
    notification_enabled: true,

    // Hide or show chat message in notification
    notification_hide_message: false,

    // Reply directly via notification or not
    // TODO: Work in progress
    notification_reply_message: true,

    // Enable or disable notification sound
    notification_sound: true,

    // Time in seconds notification should be displayed.
    notification_time: 10

}