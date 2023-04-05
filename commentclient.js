import './jquery-3.6.4.min.js'


const postButton = document.getElementById('postButton');
const getUsersButton = document.getElementById('get-users-button');


const getComments = () => {
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
}


postButton.addEventListener('click', () => {
  const title = $('meta[property="og:title"]').attr("content");
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const comment = document.getElementById("comment").value;
  
  const result = JSON.stringify({ "title":title, "name":name, "email":email, "comment":comment });
  
  fetch('http://localhost:3000/comments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8'
    },
    body: result
  })
  .then(res => {
    if (!res.ok) {
      return res.text().then(text => { throw new Error(text) })
    } else {
      return res.text().then(text => { alert(text) })
    }
  })
  .catch(err => {
    alert(err);
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

$(function() {
  getComments();
});