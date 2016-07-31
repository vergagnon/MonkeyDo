

//Used to Store a List of Tasks in our localStorage (browser)
function getArray()
{
	var toDoList = new Array;							//Create An Array
	var taskStr = localStorage.getItem('toDoList');		//Get the Task from Input using LocalStorage
	if(taskStr !== null)								//if the value is NOT empty --null--
		{
			toDoList = JSON.parse(taskStr);
		}
	return toDoList;
}



//Adds the Input from our App
function addTask()
{
	var task = document.getElementById("taskName").value;			//create a variable to hold value of input
	var array = getArray();							//create a variable to hold our Array
	array.push(task);												//pushing the task into the Array
	localStorage.setItem('toDoList', JSON.stringify(array));		//Store the task localStorage saving to the Array
	show();
	
	return false;
}

//Remove Tasks linked to their Button
function removeTask()
{
	var id= this.getAttribute(id);								//Specific ID to select the button
	var array = getArray();										//create Array
	array.splice(id, 1);										//splicing the task we want removed
	localStorage.setItem('toDoList', JSON.stringify(array));	//Saving the new/edited array into localStorage
	show();														//show the latest List of Tasks
	
	return false;
}

//Displays Everything in our Array
function show()
{
	var array = getArray();			//create the variable to hold Array
	var htmlFormat = "<ul>";		//Add unordered List - Dynamic HTML Snippet of Code
	
	for (var i=0; i < array.length; i++)		//A For Loop to display the Array
		{
			htmlFormat += "<li>" + array[i] + " <button class='remove'id='"+i+"'>X</button></li>";		//Create a button tag using a class and unique id
		}
	htmlFormat += "</ul>";
	document.getElementById('taskList').innerHTML = htmlFormat;			//Show the document

	var buttons = document.getElementsByClassName('remove');				//Create Array for all the Buttons
	
	for(var j=0; j < buttons.length; j++)//Add an EventListener for when each button is clicked
		{
			buttons[j].addEventListener('click', removeTask);
		}
}


//Listens for the Event
document.getElementById('add').addEventListener('click', addTask);
//Displays an Empty Array
show();






