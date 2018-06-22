import React, { Component } from 'react';

class Feedback extends Component {
  render() {
    return (
      <div>
        {this.props.feedbackMsg ?
          <div className='row'>
            <div className='col'>
              <div className={'alert alert-' + this.props.feedbackType + ' alert-dismissible fade show'} role='alert'>
                <strong>{this.props.feedbackMsg}</strong>
                <button type='button' className='close' onClick={this.props.clearAlert} aria-label='Close'>
                  <span aria-hidden='true'>&times;</span>
                </button>
              </div> 
            </div>
          </div>
        : null}
      </div>
    );
  }
}

export default Feedback;