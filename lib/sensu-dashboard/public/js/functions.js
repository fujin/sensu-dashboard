// remap jQuery to $
(function($){})(window.jQuery);

var filtered_events = [];
var filtered_events_count = 0;
var filter_unknown_checks = true;

function capitaliseFirstLetter(string) {
  var newStr = '';
  var splitStr = string.split(' ');
  for (var word in splitStr) {
    newStr += splitStr[word].charAt(0).toUpperCase() + splitStr[word].slice(1) + ' ';
  }
  return newStr;
}

function sortEvents(a,b) {
  return a - b;
}

function fetchEvents() {
  var event_count = 0;

  $.getJSON('/events.json', function(data) {
    m_events = new Array();

    $('table#events > tbody').empty();

    for (var nodekey in data) {
      if ((filtered_events_count > 0) && ($.inArray(nodekey, filtered_events) == -1)) {
      } else {
        var node = data[nodekey];

        for (var a in node) {
          var is_unknown = node[a]['status'] >= 3 || node[a]['status'] < 0;

          if (filter_unknown_checks) {
            if (node[a]['output'] == 'Unknown check') {
              break;
            }
          }

          event_count++;
          var dataObject = {
            identifier: SHA1(nodekey+a),
            client: nodekey,
            check: a,
            status: node[a]['status'],
            output: node[a]['output'],
            occurrences: node[a]['occurrences'],
            is_unknown: is_unknown
          };

          if (m_events[node[a]['status']] == null) {
            m_events[node[a]['status']] = new Array();
          }

          m_events[node[a]['status']][nodekey+a] = dataObject;
        }
      }
    }

    for (status in m_events) {
      for (a in m_events[status]) {
        var m_event = m_events[status][a];
        var ccheck = m_event['client'] + m_event['check'];

        $('#eventTemplate').tmpl(m_event).prependTo('table#events > tbody');

        $('tr#' + SHA1(ccheck)).click(function() {
          $('div#event_details_modal > div#event_data').empty();
          $('div#event_details_modal > div#client_data').empty();
          var selectedStatus = $(this).children('td#status').html();
          var selectedNodeKey = $(this).children('td#client').html() + $(this).children('td#check').html();
          var selectedEvent = m_events[selectedStatus][selectedNodeKey];
          $('#eventDetailsRowTemplate').tmpl(selectedEvent).appendTo('div#event_details_modal > div#event_data');

          var client_alert_img = $("#disable_client_alerts").children().first();
          $.ajax({
            url: '/stash/silence/'+selectedEvent['client']+'.json',
            success: function(data, textStatus, xhr) {
              if(xhr.status == 200) {
                client_alert_img.attr("src", "/img/megaphone_icon_off.png");
              }
            },
            error: function(xhr, textStatus, errorThrown) {
              if(xhr.status == 404) {
                client_alert_img.attr("src", "/img/megaphone_icon.png");
              }
            }});

          var event_alert_img = $("#disable_client_check_alerts").children().first();
          $.ajax({
            url: '/stash/silence/'+selectedEvent['client']+'/'+selectedEvent['check']+'.json',
            success: function(data, textStatus, xhr) {
              if(xhr.status == 200) {
                event_alert_img.attr("src", "/img/megaphone_icon_off.png");
              }
            },
            error: function(xhr, textStatus, errorThrown) {
              if(xhr.status == 404) {
                event_alert_img.attr("src", "/img/megaphone_icon.png");
              }
            }});

          $.getJSON('/client/'+selectedEvent['client']+'.json', function(data) {
            var client = data;
            client['subscriptions'] = client['subscriptions'].join(', ');
            $('#clientDetailsRowTemplate').tmpl(client).appendTo('div#event_details_modal > div#client_data');
            $('div#event_details_modal > div#client_data > h1').click(function() {
              $(this).select();
            });
          });
        });
      }
    }

    $('tr[rel*=leanModal]').leanModal({ top : 50, bottom : 50 });

    $('span#event_count').html(event_count);
  });
}

function fetchClients() {
  $.getJSON('/clients.json', function(data) {

    m_clients = new Array();

    $('table#clients > tbody').empty();

    for (var clientkey in data) {
      var client = data[clientkey];
      client['subscriptions'] = client['subscriptions'].join(', ');
      m_clients.push(client);
    }

    $('#clientTemplate').tmpl(m_clients).prependTo('table#clients > tbody');

    $('tbody > tr').click(function() {
      $('div#event_details_modal > div#client_data').empty();

      var client_id = $(this).children('td#client_id').html();

      $.getJSON('/client/'+client_id+'.json', function(clientdata) {
        $('#clientDetailsRowTemplate').tmpl(clientdata).appendTo('div#event_details_modal > div#client_data');
      });
    });

    $('tr[rel*=leanModal]').leanModal({ top : 50, bottom : 50 });
    var row_count = $('table#clients > tbody > tr').length;
    $('span#client_count').html(row_count);
  });
}

function filterEvents() {
  var values = $("input[type=hidden]").val().split(",");
  filtered_events = [];
  filtered_events_count = 0;

  for(value in values) {
    if(values[value] != "") {
      filtered_events_count++;
      filtered_events.push(values[value]);
    }
  }

  fetchEvents();
}

/* trigger when page is ready */
$(document).ready(function() {

  $("input[type=text]").autoSuggest("http://" + location.hostname + ":" + location.port + "/autocomplete.json", {
    startText: "Enter keywords to filter by",
    selectedItemProp: "name",
    searchObjProps: "name",
    selectionAdded: function(elem) {
      filterEvents();
    },
    selectionRemoved: function(elem) {
      elem.fadeTo("fast", 0, function() { elem.remove(); });
      filterEvents();
    }
  });

  $(document).keyup(function(e) {
    if (e.keyCode == 27) { // esc
      $("#lean_overlay").fadeOut(200);
      $("#event_details_modal").css({'display':'none'});
    }
  });

  $('#filter_unknown_checks').change(function() {
    filter_unknown_checks = !filter_unknown_checks;
    fetchEvents();
  });

  // TODO: fix clipboard support
  /*$('div#event_details_modal > div.event_detail_group > div.copy').click(function() {
    var currentVal = $(this).parent().find('div.event_detail').children().last().text();

    $(this).zclip({
      path:'swf/ZeroClipboard.swf',
      copy:currentVal
    });
  });*/

});


/* optional triggers

$(window).load(function() {

});

$(window).resize(function() {

});

*/
