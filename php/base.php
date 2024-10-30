<?php

//Recibir la variable enviada desde JavaScript
$nombre = $_POST['nombre'];
$email = $_POST['email'];
$seleccion = $_POST['seleccion'];
$huella = $_POST['huella'];

$conn = new mysqli('localhost', 'root', '', 'huella');

// Insertar la variable en la base de datos
$query = "insert into users values(null, '$nombre', '$email', '$seleccion', '$huella')";
$conn->query($query);
$conn->close();

?>