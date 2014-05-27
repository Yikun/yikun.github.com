function addBookListall(leisuretimecontent){
	var booklist=eval(leisuretimecontent);
	for(var i=0;i<booklist.length;i++){
	   addBook(booklist[i].asset,booklist[i].title,booklist[i].text, booklist[i].date);
	}
}
function addBook(image, title, content, date){
	var pic = document.createElement("aside");
	pic.innerHTML="<img src=\""+ image +"\">";
	
	var detail = document.createElement("section")
	detail.setAttribute("class","intro");
	detail.innerHTML="<ul><li>"+ title +"</li><li>"+date+"</li><li>"+content+"</li></ul>"
	
	var booklists = document.createElement("article")
	booklists.setAttribute("class","leisure")
	booklists.appendChild(pic)
	booklists.appendChild(detail)
	document.getElementById('booklists').innerHTML+="<hr>"
	document.getElementById('booklists').appendChild(booklists)
}
