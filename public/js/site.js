var socket = io();

socket.on('new poll responses', function(data) {
  var id = data.id
  var responses = data.responses
  // sum
  var totalResponses = data.responses.reduce(function(a, b) {
    return a + b
  })
  var $poll = $(".poll[data-poll-id='" + id + "']")
  $poll.find(".poll-total-responses").text(totalResponses)
  responses.forEach(function(count, choiceId) {
    var $option = $poll.find("[data-choice-id='" + choiceId + "']")
    $option.find(".poll-option-count").text(count)
    $option.find(".poll-option-bar").width(((count / totalResponses) * 100) + "%")
    $option.find(".poll-option-percentage").text(Math.round((count / totalResponses) * 100) + "%")
  })
})

$(".poll-button").on("click", function(event) {
  var allButtons =$(this).parents(".poll").find(".poll-button")
  allButtons.attr("disabled", "disabled")
  var choiceId = $(this).parents(".poll-option").data("choice-id")
  var pollId = $(this).parents(".poll").data("poll-id")
  $.post("/poll/" + pollId + "/response", {
    choice: choiceId
  }, function() {
    allButtons.removeAttr("disabled")
  })
})

$("#add-option-button").on("click", function(event) {
  var lastOptionIndex = parseInt($("#new-poll-form").find("input").last().attr("name").match(/[0-9]+/)[0])
  var newHTML = '<label for="option#">Option #</label><input type="text" name="option#"></input><br>'.replace(/#/g, lastOptionIndex + 1)
  $("#add-option-button").before(newHTML)
})
