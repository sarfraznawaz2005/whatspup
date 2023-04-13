module.exports = {

    // user to chat with selector. We will "click" this selector so that chat window of
    // specified user is opened. XXX will be replaced by actual user.
    user_chat: '[title="XXX"] .matched-text',

    // search box to find users
    search_box: '#side [contenteditable]',

    // textbox selector where message will be typed
    chat_input: '#main [data-testid="conversation-compose-box-input"]',

    // used to read last message sent by other person
    last_message: '#main div.message-in',

    // last message sent by you
    last_message_sent: '#main div.message-out span.selectable-text:last-child',

    // used to check if your messsage was read
    last_message_read: '#main div.message-out span[data-icon]:last-child',

    // gets username for conversation thread
    user_name: '#main [data-testid="conversation-info-header-chat-title"]',

    // checks if there are new messages by any users

    new_message: '#pane-side span.XXXXX',
    new_message_user: 'span[title]',
    new_message_count: "#pane-side span",
    new_message_user_pic_url: '#pane-side img[src^="https://web.whatsapp.com/pp"]'

}
