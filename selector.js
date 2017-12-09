module.exports = {

    // user to chat with selector. We will "click" this selector so that chat window of
    // specified user is opened. XXX will be replaced by actual user.
    user_chat: '#pane-side div.chat-main > div.chat-title > span[title="XXX"]',

    // textbox selector where message will be typed
    chat_input: '#main > footer > div.block-compose > div.input-container > div > div.pluggable-input-body',

    // used to read last message sent by other person
    last_message: '#main div.message-in.message-chat span.emojitext:last-child',

    // last message sent by you
    last_message_sent: '#main div.message-out.message-chat span.emojitext:last-child',

    // used to check if your messsage was read
    last_message_read: '#main div.message-out.message-chat div.bubble-text-meta div.status-icon:last-child',

    // gets username for conversation thread
    user_name: '#main > header > div.chat-body > div > div > span'

}