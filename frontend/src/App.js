import React from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form'
import FormGroup from 'react-bootstrap/FormGroup'
// import ReactDOM from 'react-dom';

function App(props) {
  return (
    <Form>
      <FormGroup controlId="formBasicEmail">
        <Form.Label>Email address</Form.Label>
        <Form.Control type="file" placeholder="Enter email" />
      </FormGroup>
    </Form>
  );
}

class App0 extends React.Component {
  state = {
    posts: []
  }

  componentDidMount() {
    const that = this;
    fetch(`https://www.reddit.com/r/${this.props.subreddit}.json`)
      // fetch(`http://localhost:5000/test`)
      .then(res => {
        return res.json();
      }).then(function (myJson) {
        console.log("in 2nd then");
        // console.log(JSON.stringify(myJson.data.children));
        const posts = myJson.data.children.map(obj => obj.data);
        console.log("posts is");
        console.log(posts);
        that.setState({ posts });

      });
  }

  render() {
    console.log("in render, this.props is ");
    console.log(this.props);
    console.log("state is ");
    console.log(this.state);

    return (
      <div>
        <h1>{`/r/${this.props.subreddit}`}</h1>
        <ul>
          {this.state.posts.map(post =>
            <li key={post.id}>{post.title}</li>
          )}
        </ul>
      </div>
    );
  }
}

// ReactDOM.render(
//   <App subreddit="reactjs" />,
//   document.getElementById('root')
// );

export default App;
