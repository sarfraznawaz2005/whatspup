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

    // If true, your last message sent will be notified when read by other user
    read_receipts: true,

    ////////////////////////////////////////////////////////////////
    // CHAT COLOR SETTINGS
    ////////////////////////////////////////////////////////////////    
    // Colors: black, red, green, yellow, blue, magenta, cyan, white, gray

    // If true, colored messages will be shown
    colors: true,

    received_message_color: 'green',
    received_message_color_new_user: 'magenta',
    sent_message_color: 'yellow',

    ////////////////////////////////////////////////////////////////
    // CHAT NOTIFICATION SETTINGS
    ////////////////////////////////////////////////////////////////

    // Enable or disable desktop notifications
    notification_enabled: true,

    // Hide or show chat message in notification
    notification_hide_message: false,

    // If notification_hide_message is TRUE, this content will be shown in notification for user's message
    notification_hidden_message: "New Message Received",

    // Hide or show chat user name in notification
    notification_hide_user: false,

    // If notification_hide_user is TRUE, this content will be shown in notification for user's name
    notification_hidden_user: "Someone",

    // Reply directly via notification or not
    // TODO: To be implemented...
    notification_reply_message: true,

    // Enable or disable notification sound
    notification_sound: true,

    // Time in seconds notification should be displayed.
    notification_time: 10

}