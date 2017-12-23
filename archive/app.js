function read(url){
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.onload = function() {
        if (request.status >= 200 && request.status < 400) {
            var data = JSON.parse(request.responseText);
            displayArchive(data);
        }
    }
    request.send();
}

var arr = ["440949","452124","452130","452129","452131","452134","452135","443733"];
arr.forEach(function(item){
    read("http://jonasjohansson.dropmark.com/"+item+".json");
});

function displayArchive(data, list) {

    if (data.type == "global"){
        let h2 = document.createElement("h2");
        let link = createLink(data);
        var list = document.createElement("ol");
        h2.appendChild(link);
        document.body.appendChild(h2);
        document.body.appendChild(list);
    }

    data.items.map(item => {

        let link = createLink(item);
        let listitem = document.createElement("li");
        list.appendChild(listitem);

        switch (item.type){
            case "link":
            case "audio":
            case "video":
            case "image":
                listitem.appendChild(link);
                break;
            case "stack":
                let h3 = document.createElement("h3");
                let sublist = document.createElement("ol");
                h3.appendChild(link);
                listitem.appendChild(h3);
                listitem.appendChild(sublist);
                displayArchive(item, sublist);
                break;
        }
    });
}

function createLink(item){
    let link = document.createElement("a");
    let span = document.createElement("span");
    link.setAttribute("data-name",item.name);
    link.setAttribute("data-type",item.type);
    let name = item.name.replace(/_/g," ");
    name = name.replace(/%2B/g,"+");
    name = name.replace(/%26/g,"&");
    name.toLowerCase();
    span.textContent = name;
    link.classList.add(item.type);
    if (item.type == "stack" || item.type == "global"){
        link.href = item.short_url;
    } else {
        link.href = item.link;
        if (item.thumbnails){
            let img = document.createElement("img");
            img.src = item.thumbnails.small;
            let tries = 0;
            img.onerror = function(){
                if (tries == 0)
                    img.src = item.thumbnails.cropped;
                tries++
            }
            link.appendChild(img);
        }
    }
    link.appendChild(span);
    return link;
}