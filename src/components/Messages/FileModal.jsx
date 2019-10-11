import React, { Component } from 'react'
import { Button, Icon, Input, Modal } from 'semantic-ui-react'
import mime from 'mime-types'

class FileModal extends Component {
  state = {
    file: null,
    authorized: ['image/jpeg', 'image/png']
  }

  addFile = e => {
    const file = e.target.files[0]
    if (file) {
      this.setState({ file })
    }
  }

  sendFile = () => {
    const { file } = this.state
    const { uploadFile, closeModal } = this.props

    if (file !== null) {
      if (this.isAuthorized(file.name)) {
        const metadata = { contentType: mime.lookup(file.name) }
        uploadFile(file, metadata)
        closeModal()
        this.clearFile()
      }
    }
  }

  clearFile = () => {
    this.setState({ file: null })
  }

  isAuthorized = fileName =>
    this.state.authorized.includes(mime.lookup(fileName))

  render() {
    const { modal, closeModal } = this.props
    return (
      <Modal open={modal} onClose={closeModal}>
        <Modal.Header>Select an Image File</Modal.Header>
        <Modal.Content>
          <Input
            onChange={this.addFile}
            fluid
            label="File types: jpg, png"
            name="file"
            type="file"
          />
        </Modal.Content>
        <Modal.Actions>
          <Button color="green" inverted onClick={this.sendFile}>
            <Icon name="checkmark" />
            Send
          </Button>
          <Button color="red" inverted onClick={closeModal}>
            <Icon name="remove" />
            Cancel
          </Button>
        </Modal.Actions>
      </Modal>
    )
  }
}

export default FileModal
