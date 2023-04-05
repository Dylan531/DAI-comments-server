import './jquery-3.6.4.min.js'

const postButton = document.getElementById('postButton');
const getUsersButton = document.getElementById('get-users-button');


$(function() {

  // Get the title of the article
  const title = $('meta[property="og:title"]').attr('content');
  
  // Encode the title so that it can be included in the URI
  const queryTitle = Object.entries({ title: title })
  .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
  .join('&');

  // Fetch the comments of the specified article with the API
  fetch(`http://localhost:3000/comments?${queryTitle}`)
  .then(response => response.json())
  .then(data => {
    data.forEach(comment => {
      const commentTemplate = `
        <div class="comment-container">
          <div class="comment-header">${comment.name}</div>
          <div class="comment-body">${comment.comment}</div>
          <div class="comment-footer">${comment.date}</div>
        </div>
      `;
      $('#comments').append(commentTemplate);
    })
  })
  .catch(error => {
    console.error(error);
  });
  
  
});



postButton.addEventListener('click', async () => {
  const title = $('meta[property="og:title"]').attr('content');
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const comment = document.getElementById('comment').value;
  

  await fetch('http://localhost:3000/comments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title, name, email, comment })
  })
  .then(response => response.json())
  .then(response => {
    if (response.ok) {
      console.log(response);
    } else {
      console.log(response);
      console.error('Failed to post comment!');
    }
  })
  .catch(error => {
    console.error(error);
  });
});

getUsersButton.addEventListener('click', () => {
    fetch('http://localhost:3000/users', {method: 'GET'},)
      .then(response => response.json())
      .then(data => {
        console.log(data);
      })
      .catch(error => {
        console.error(error);
      });
  });