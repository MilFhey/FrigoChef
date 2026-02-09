/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// Wait for the deviceready event before using any of Cordova's device APIs.
document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    document.getElementById("validateBtn").addEventListener("click", afficherInfoDevice);
    document.getElementById("clearBtn").addEventListener("click", supprimerInfoDevice);
    document.getElementById("connectBtn").addEventListener("click", checkConnection);
    document.getElementById("takeBtn").addEventListener("click", photo);
    document.getElementById("loadBtn").addEventListener("click", loadPhoto);
    document.getElementById("getPositionBtn").addEventListener("click", getPosition);
}

function afficherInfoDevice() {
    document.getElementById("deviceInfo").innerHTML =
        "Cordova version: " + device.cordova + "<br />" +
        "Device model: " + device.model + "<br/>" +
        "Device platform: " + device.platform + "<br />" +
        "Device version: " + device.version + "<br />" +
        "Device manufacturer: " + device.manufacturer;
}

function supprimerInfoDevice() {
    document.getElementById("deviceInfo").innerHTML = "";
    document.getElementById("netInfo").innerHTML = "";
    document.getElementById("geoInfo").innerHTML = "";
}

function checkConnection() {
    var networkState = navigator.connection.type;

    var states = {};
    states[Connection.UNKNOWN]  = 'Connection inconnu';
    states[Connection.ETHERNET] = 'Connection Ethernet';
    states[Connection.WIFI]     = 'Connection Wifi';
    states[Connection.CELL_2G]  = 'Cellulaire 2G';
    states[Connection.CELL_3G]  = 'Cellulaire 3G';
    states[Connection.CELL_4G]  = 'Cellulaire 4G';
    states[Connection.CELL]     = 'Cellulaire inconnu';
    states[Connection.NONE]     = 'Pas de connexion internet';

    document.getElementById('netInfo').innerHTML = states[networkState];
}

function photo() {
    navigator.camera.getPicture(onSuccess, onFail, {
        quality: 80,                                            
        destinationType: Camera.DestinationType.DATA_URL,
        sourceType: Camera.PictureSourceType.CAMERA,
        encodingType: Camera.EncodingType.JPEG,                 
        mediaType: Camera.MediaType.PICTURE,                    
        correctOrientation: true,                               
        saveToPhotoAlbum: true,                                 
        cameraDirection: Camera.Direction.BACK,                 
        targetWidth: 1024,                                      
        targetHeight: 1024                                      
    });
}

function loadPhoto() {
    navigator.camera.getPicture(onSuccess, onFail, {
        quality: 80,                                            
        destinationType: Camera.DestinationType.DATA_URL,
        sourceType: Camera.PictureSourceType.PHOTOLIBRARY,     
        encodingType: Camera.EncodingType.JPEG,                 
        mediaType: Camera.MediaType.PICTURE,                    
        correctOrientation: true,                               
        targetWidth: 1024,                                      
        targetHeight: 1024                                      
    });
}

function onSuccess(imageData) {
    var image = document.getElementById("logoImg");
    
    // Animation de fondu pour un meilleur effet visuel
    image.style.opacity = '0';
    image.style.display = "block";
    image.src = imageData;
    
    // Fondu progressif de l'image
    setTimeout(function() {
        image.style.transition = 'opacity 0.3s ease-in';
        image.style.opacity = '1';
    }, 50);
}

function onFail(message) {
    alert("Erreur: " + message);
}

function getPosition() {
    var options = {
        enableHighAccuracy: true,
        maximumAge: 0
    };
    
    navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
    
    function onSuccess(position) {
        document.getElementById('geoInfo').innerHTML = 
            '<strong>Latitude:</strong> ' + position.coords.latitude + '<br/>' +
            '<strong>Longitude:</strong> ' + position.coords.longitude + '<br/>' +
            '<strong>Altitude:</strong> ' + position.coords.altitude + '<br/>' +
            '<strong>Précision:</strong> ' + position.coords.accuracy + ' m<br/>' +
            '<strong>Précision altitude:</strong> ' + position.coords.altitudeAccuracy + ' m<br/>' +
            '<strong>Cap:</strong> ' + position.coords.heading + '°<br/>' +
            '<strong>Vitesse:</strong> ' + position.coords.speed + ' m/s<br/>' +
            '<strong>Timestamp:</strong> ' + new Date(position.timestamp).toLocaleString();
    }
    
    function onError(error) {
        var errorMessage = '';
        switch(error.code) {
            case error.PERMISSION_DENIED:
                errorMessage = "L'utilisateur a refusé la demande de géolocalisation.";
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage = "Les informations de localisation ne sont pas disponibles.";
                break;
            case error.TIMEOUT:
                errorMessage = "La demande de géolocalisation a expiré.";
                break;
            case error.UNKNOWN_ERROR:
                errorMessage = "Une erreur inconnue s'est produite.";
                break;
        }
        document.getElementById('geoInfo').innerHTML = '<strong style="color: red;">Erreur:</strong> ' + errorMessage + '<br/><strong>Code:</strong> ' + error.code;
    }
}