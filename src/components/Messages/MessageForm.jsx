import React, { Component } from 'react'
import { Button, Input, Segment } from 'semantic-ui-react'
import { emojiIndex, Picker } from 'emoji-mart'
import uuidv4 from 'uuid/v4'
import 'emoji-mart/css/emoji-mart.css'

import firebase from '../../firebase'
import FileModal from './FileModal'
import ProgressBar from './ProgressBar'

class MessageForm extends Component {
  state = {
    storageRef: firebase.storage().ref(),
    typingRef: firebase.database().ref('typing'),
    uploadTask: null,
    uploadState: '',
    percentUploaded: 0,
    message: '',
    channel: this.props.currentChannel,
    user: this.props.currentUser,
    loading: false,
    errors: [],
    modal: false,
    emojiPicker: false
  }

  componentWillUnmount() {
    if (this.state.uploadTask !== null) {
      this.state.uploadTask.cancel()
      this.setState({ uploadTask: null })
    }
  }

  openModal = () => this.setState({ modal: true })

  closeModal = () => this.setState({ modal: false })

  handleChange = e => {
    this.setState({ [e.target.name]: e.target.value })
  }

  handleKeyDown = e => {
    if (e.keyCode === 13) {
      this.sendMessage()
    }

    const { message, typingRef, channel, user } = this.state

    if (message) {
      typingRef
        .child(channel.id)
        .child(user.uid)
        .set(user.displayName)
    } else {
      typingRef
        .child(channel.id)
        .child(user.uid)
        .remove()
    }
  }

  handleTogglePicker = () => {
    this.setState({ emojiPicker: !this.state.emojiPicker })
  }

  handleAddEmoji = emoji => {
    const oldMessage = this.state.message
    const newMessage = this.colonToUnicode(` ${oldMessage} ${emoji.colons} `)
    this.setState({ message: newMessage, emojiPicker: false })
    setTimeout(() => this.messageInputRef.focus(), 0)
  }

  colonToUnicode = message => {
    return message.replace(/:[A-Za-z0-9_+-]+:/g, x => {
      x = x.replace(/:/g, '')
      let emoji = emojiIndex.emojis[x]
      if (typeof emoji !== 'undefined') {
        let unicode = emoji.native
        if (typeof unicode !== 'undefined') {
          return unicode
        }
      }
      x = ':' + x + ':'
      return x
    })
  }

  createMessage = (fileUrl = null) => {
    const message = {
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      user: {
        id: this.state.user.uid,
        name: this.state.user.displayName,
        avatar: this.state.user.photoURL
      }
    }
    if (fileUrl !== null) {
      message['image'] = fileUrl
    } else {
      message['content'] = this.state.message
    }
    return message
  }

  sendMessage = () => {
    const { getMessagesRef } = this.props
    const { message, channel, user, typingRef } = this.state

    if (message) {
      this.setState({ loading: true })
      getMessagesRef()
        .child(channel.id)
        .push()
        .set(this.createMessage())
        .then(() => {
          this.setState({ loading: false, message: '', errors: [] })
          typingRef
            .child(channel.id)
            .child(user.uid)
            .remove()
        })
        .catch(error => {
          console.error(error)
          this.setState({
            loading: false,
            errors: this.state.errors.concat(error)
          })
        })
    } else {
      this.setState({
        errors: this.state.errors.concat({ message: 'Add a message' })
      })
    }
  }

  getPath = () => {
    if (this.props.isPrivateChannel) {
      return `chat/private-${this.state.channel.id}`
    } else {
      return 'chat/public'
    }
  }

  uploadFile = (file, metadata) => {
    const pathToUpload = this.state.channel.id
    const ref = this.props.getMessagesRef()
    const filePath = `${this.getPath()}/${uuidv4()}.jpg`
    this.setState(
      {
        uploadState: 'uploading',
        uploadTask: this.state.storageRef.child(filePath).put(file, metadata)
      },
      () => {
        this.state.uploadTask.on(
          'state_changed',
          snap => {
            const percentUploaded = Math.round(
              (snap.bytesTransferred / snap.totalBytes) * 100
            )
            this.props.isProgressBarVisible(this.state.uploadState)
            this.setState({ percentUploaded })
          },
          error => {
            console.error(error)
            this.setState({
              errors: this.state.errors.concat(error),
              uploadState: 'error',
              uploadTask: null
            })
          },
          () => {
            this.state.uploadTask.snapshot.ref
              .getDownloadURL()
              .then(downloadUrl => {
                this.sendFileMessage(downloadUrl, ref, pathToUpload)
              })
              .catch(error => {
                console.error(error)
                this.setState({
                  errors: this.state.errors.concat(error),
                  uploadState: 'error',
                  uploadTask: null
                })
              })
          }
        )
      }
    )
  }

  sendFileMessage = (fileUrl, ref, pathToUpload) => {
    ref
      .child(pathToUpload)
      .push()
      .set(this.createMessage(fileUrl))
      .then(() => {
        this.setState({ uploadState: 'done' })
        this.props.isProgressBarVisible(this.state.uploadState)
      })
      .catch(error => {
        console.error(error)
        this.setState({
          errors: this.state.errors.concat(error)
        })
      })
  }

  render() {
    const {
      errors,
      message,
      loading,
      modal,
      uploadState,
      percentUploaded,
      emojiPicker
    } = this.state
    return (
      <React.Fragment>
        {emojiPicker && (
          <div
            className={
              this.props.progressBar ? 'emojipicker__progress' : 'emojipicker'
            }
          >
            <Picker
              set="apple"
              onSelect={this.handleAddEmoji}
              title="Pick your emoji"
              emoji="point_up"
            />
          </div>
        )}
        <Segment className="message__form">
          <Input
            fluid
            name="message"
            onChange={this.handleChange}
            onKeyDown={this.handleKeyDown}
            value={message}
            ref={node => (this.messageInputRef = node)}
            style={{ marginBottom: '0.7em' }}
            label={
              <Button
                icon={emojiPicker ? 'close' : 'smile outline'}
                content={emojiPicker ? 'Close' : null}
                onClick={this.handleTogglePicker}
              />
            }
            labelPosition="right"
            className={
              errors.some(error => error.message.includes('message'))
                ? 'error'
                : ''
            }
            placeholder="Write your message"
          />
          <Button.Group icon widths="2">
            <Button
              onClick={this.sendMessage}
              disabled={loading}
              color="orange"
              content="Add Reply"
              labelPosition="left"
              icon="edit"
            />
            <Button
              color="teal"
              onClick={this.openModal}
              content="Upload Media"
              labelPosition="right"
              icon="cloud upload"
              disabled={uploadState === 'uploading'}
            />
          </Button.Group>
          <FileModal
            modal={modal}
            closeModal={this.closeModal}
            uploadFile={this.uploadFile}
          />
          <ProgressBar
            uploadState={uploadState}
            percentUploaded={percentUploaded}
          />
        </Segment>
      </React.Fragment>
    )
  }
}

export default MessageForm
