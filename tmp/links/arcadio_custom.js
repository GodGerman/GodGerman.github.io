//---------------------- fixed nav ----------------------
$(window).scroll(function () {
   if ($(this).scrollTop() > 0){
       $(".navegacion").addClass("navegacion-fija");
   } else {
       $(".navegacion").removeClass("navegacion-fija");
   }
});


document.addEventListener('DOMContentLoaded', function() {
    elems = document.querySelectorAll('.modal');
    modal = M.Modal.init(elems);
});

//---------------------- Side Nav Init ----------------------
document.addEventListener('DOMContentLoaded', function() {
    elems = document.querySelectorAll('.sidenav');
    instances = M.Sidenav.init(elems);
});

//---------------------- Slider Init ----------------------
document.addEventListener('DOMContentLoaded', function() {
    elems = document.querySelectorAll('.slider');
    instances = M.Slider.init(elems, {
        height: window.innerHeight - 50,
        /*indicators: false*/
    });
});

//---------------------- Tool tips Init ----------------------
document.addEventListener('DOMContentLoaded', function() {
    elems = document.querySelectorAll('.tooltipped');
    instances = M.Tooltip.init(elems, {

    });
});

//---------------------- Ajax Contact form ----------------------

$("#msgform").submit(function () {
    $.post("php/message.php", $(this).serialize(), respuesta);
    return false;
});

$(document).ajaxStart(function () {
    $("#botonEnviar").hide();
    $("#preloader").fadeIn().removeClass("hide");
}).ajaxStop(function () {
    $("#botonEnviar").fadeIn();
    $("#preloader").fadeOut().addClass("hide");
});

function respuesta(res) {

    mensaje = $("#respuesta");
    if (res === "yes") {

        mensaje.removeClass("red-text");
        mensaje.addClass("green-text");
        mensaje.text("Mensaje eviado correctamente");

    } else {

        mensaje.removeClass("green-text");
        mensaje.addClass("red-text");
        mensaje.text("Error al enviar el mensaje");

    }
}

particlesJS("particles-js", {
    "particles": {
        "number": {//número de puntos
            "value": 100,
            "density": {
                "enable": true,
                "value_area": 1000
            }
        },
        "color": {//color de los puntos
            "value": "#ffffff"
        },
        "shape": {//forma de los puntos
            "type": "circle",
            "stroke": {
                "width": 0,
                "color": "#000000"
            },
            "polygon": {
                "nb_sides": 5
            }
        },
        "opacity": {
            "value": 0.5,
            "random": false,
            "anim": {
                "enable": false,
                "speed": 1,
                "opacity_min": 0.1,
                "sync": false
            }
        },
        "size": {//tamaño de los puntos
            "value": 5,
            "random": true,
            "anim": {
                "enable": false,
                "speed": 40,
                "size_min": 0.1,
                "sync": false
            }
        },
        "line_linked": {
            "enable": true,
            "distance": 150,
            "color": "#ffffff",
            "opacity": 0.4,
            "width": 1
        },
        "move": {
            "enable": true,
            "speed": 2,//velecidad de la animación
            "direction": "none",
            "random": false,
            "straight": false,
            "out_mode": "out",
            "bounce": false,
            "attract": {
                "enable": false,
                "rotateX": 600,
                "rotateY": 1200
            }
        }
    },
    "interactivity": {
        "detect_on": "canvas",
        "events": {
            "onhover": {
                "enable": true,
                "mode": "grab"
            },
            "onclick": {
                "enable": true,
                "mode": "push"
            },
            "resize": true
        },
        "modes": {
            "grab": {
                "distance": 140,
                "line_linked": {
                    "opacity": 1
                }
            },
            "bubble": {
                "distance": 400,
                "size": 40,
                "duration": 2,
                "opacity": 8,
                "speed": 3
            },
            "repulse": {
                "distance": 200,
                "duration": 0.4
            },
            "push": {
                "particles_nb": 4
            },
            "remove": {
                "particles_nb": 2
            }
        }
    },
    "retina_detect": true
});