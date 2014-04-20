function addBookListall(leisuretimecontent){
	var booklist=eval(leisuretimecontent);
	for(var i=0;i<booklist.length;i++){
	   addBook(booklist[i].asset,booklist[i].title,booklist[i].text, booklist[i].date);
	}
}
function addBook(image, title, content, date){
	var pic = document.createElement("DIV")
	pic.setAttribute("class","col-md-2");
	pic.innerHTML="<img src=\""+ image +"\" width=\"128\" height=\"182\"><br>"
	
	var detail = document.createElement("DIV")
	detail.setAttribute("class","col-md-7");
	detail.innerHTML="<h3><a>"+ title +"</a></h3><br><h4>"+date+"</h4><br>"+content
	
	var booklists = document.createElement("DIV")
	booklists.setAttribute("class","row")
	booklists.appendChild(pic)
	booklists.appendChild(detail)
	document.getElementById('booklists').innerHTML+="<hr>"
	document.getElementById('booklists').appendChild(booklists)
}
