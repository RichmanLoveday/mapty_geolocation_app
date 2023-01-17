'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const formBtn = document.querySelector('.form__btn');



class Workout {
    date = new Date();
    id;
    click = 0;

    constructor(coords, distance, duration, id = (Date.now() + '').slice(-10)) {
        this.coords = coords;       // array of [lat, lng] 
        this.distance = distance;   // in km
        this.duration = duration;   // in min
        this.id = id;
    }

    _setDescription() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }

    clicks() {
        this.click++;
    }
}

class Running extends Workout {
    type = 'running';
    pace = 0;
    constructor(coords, distance, duration, cadence, id) {
        super(coords, distance, duration, id);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        // min/Km
        this.pace = this.duration / this.distance;
        console.log(this.pace)
        return this.pace;
    }
};

class Cycling extends Workout {
    type = 'cycling';
    speed;
    constructor(coords, distance, duration, elevationGain, id) {
        super(coords, distance, duration, id);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        // km/h
        this.speed = this.distance / (this.duration / 60)
        return this.speed;
    }
};



// const run1 = new running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);



////////////////////////////////////
// APPLICATION ARCHITECTURE

class App {
    #map;
    #mapEvent;
    #workout = [];
    #mapZoomLevel = 13;

    constructor() {
        // get user position
        this._getPosition();

        // Get data from local storage
        this._getLocalStorage();

        // Attach event handles
        form.addEventListener('submit', this._newWorkOut.bind(this));
        inputType.addEventListener('change', this._toggleElevationField);
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    }

    _getPosition() {
        // Using geolocation api
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
                alert('Could not get your location');
            });
        };

    }

    _loadMap(position) {
        const { latitude } = position.coords;
        const { longitude } = position.coords;
        console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

        const coords = [latitude, longitude];

        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
        // console.log(this.#map);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        // Handling clicks on map
        this.#map.on('click', this._showForm.bind(this));


        this.#workout.forEach(work => {
            this._renderWorkoutMaker(work);
        });
    }

    _showForm(mapE) {
        console.log(this.#mapEvent)
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm() {
        // Empty input
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';

        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => form.style.display = 'grid');
    }

    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkOut(e) {
        const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));
        const allPositive = (...inputs) => inputs.every(inp => inp > 0);

        e.preventDefault();

        // Get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;

        if (this.#mapEvent) {

            const { lat, lng } = this.#mapEvent.latlng;
            //console.log(type);

            // Define workouts
            let workout;

            // If workout running, create running object
            if (type === 'running') {
                const cadence = +inputCadence.value;
                // Check if data is valid
                if (!validInput(distance, duration, cadence) || !allPositive(distance, duration, cadence)) {
                    return alert('Input have to be positive numbers!')
                }
                workout = new Running([lat, lng], distance, duration, cadence);
                console.log(workout)
            }

            // If workout cycling, create cycling object
            if (type === 'cycling') {
                const elevation = +inputElevation.value;
                // Check if data is valid
                if (!validInput(distance, duration, elevation) || !allPositive(distance, duration)) {
                    return alert('Input have to be positive numbers!')
                }
                workout = new Cycling([lat, lng], distance, duration, elevation);
            }

            // Add new object to workout array
            this.#workout.push(workout);

            // Render workout on map as marker and workOuts
            this._renderWorkoutMaker(workout);
            this._renderWorkout(workout);

            // Hide form
            this._hideForm();

            // set local storage for all workouts
            this._setLocalStorage();
        }
    }

    _renderWorkoutMaker(workout) {
        // Display marker
        //console.log(this.#mapEvent);
        L.marker(workout.coords).addTo(this.#map)
            .bindPopup(L.popup({
                maxWidth: 250,
                minWidth: 100,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`,
            }))
            .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
            .openPopup()

    }

    _renderWorkout(workout) {
        console.log(workout);
        let html = `
            <li class="workout workout--${workout.type}" data-id="${workout.id}">
                <div class="workout__flex">
                    <h2 class="workout__title">${workout.description}</h2>
                    <button class="btn-edit">EDIT</button>
                    <button class="btn-delete">X</button>
                </div>
                <div class="workout__grid ">
                    <div class="workout__details">
                        <span class="workout__icon">
                            ${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}
                        </span>
                        <span class="workout__value">
                            ${workout.distance}
                        </span>
                        <span class="workout__unit">km</span>
                    </div>
                    <div class="workout__details">
                        <span class="workout__icon">⏱</span>
                        <span class="workout__value">
                            ${workout.duration}
                        </span>
                        <span class="workout__unit">min</span>
                    </div>
        `;

        if (workout.type === 'running') {
            html += `
                    <div class="workout__details">
                        <span class="workout__icon">⚡️</span>
                        <span class="workout__value">${workout.pace.toFixed(1)}</span>
                        <span class="workout__unit">min/km</span>
                    </div>
                    <div class="workout__details">
                        <span class="workout__icon">🦶🏼</span>
                        <span class="workout__value">${workout.cadence}</span>
                        <span class="workout__unit">spm</span>
                    </div>
                </div>
            </li>
            `;
        }

        if (workout.type === 'cycling') {
            html += `
                    <div class="workout__details">
                        <span class="workout__icon">⚡️</span>
                        <span class="workout__value">${workout.speed.toFixed(1)}</span>
                        <span class="workout__unit">min/km</span>
                    </div>
                    <div class="workout__details">
                        <span class="workout__icon">🦶🏼</span>
                        <span class="workout__value">${workout.elevationGain}</span>
                        <span class="workout__unit">spm</span>
                    </div>
                </div>
            </li>
            `;
        }

        form.insertAdjacentHTML('afterend', html);



        const buttonDelete = document.querySelector('.btn-delete');

        // this._editWorkout(workout);
        const work2 = this.#workout;
        const buttonEdit = document.querySelector('.btn-edit');
        buttonEdit.addEventListener('click', this._displayData.bind(this, workout));


    }

    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');

        if (!workoutEl) return;

        const workout = this.#workout.find(work => work.id === workoutEl.dataset.id);

        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        });

        //workout.click++;
    }


    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workout));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));

        if (!data) return;

        this.#workout = data;       // restore workout data

        this.#workout.forEach(work => {
            this._renderWorkout(work);
        });
    }

    _displayData(workout, e) {
        e.preventDefault();
        console.log(e);
        //console.log(work2)
        console.log(workout);

        // Display form
        form.classList.toggle('hidden');

        // Add values to form
        const select = document.querySelector('select');
        if (workout.type === 'running') {

            inputCadence.closest('.form__row').classList.remove('form__row--hidden');
            inputElevation.closest('.form__row').classList.add('form__row--hidden');

            console.log(select);
            select.options[1].selected = false;
            select.options[0].selected = true;
            inputCadence.value = workout.cadence;
            inputDistance.value = workout.distance;
            inputDuration.value = workout.duration;
            inputElevation.value = '';


            // console.log(this.#workout);
            formBtn.style.display = 'block';
            formBtn.addEventListener('click', this._editData.bind(this, workout));
        }

        if (workout.type === 'cycling') {

            inputElevation.closest('.form__row').classList.remove('form__row--hidden');
            inputCadence.closest('.form__row').classList.add('form__row--hidden');

            console.log(workout.elevationGain);
            select.options[0].selected = false;
            select.options[1].selected = true;
            inputElevation.value = workout.elevationGain;
            inputDistance.value = workout.distance;
            inputDuration.value = workout.duration;
            inputCadence.value = '';

            // console.log(this.#workout);

            formBtn.style.display = 'block';
            formBtn.addEventListener('click', this._editData.bind(this, workout))
        }

    }

    _editData(workout) {
        //e.preventDefault();
        // const id = workout.id;
        // const work = this.#workout.findIndex(work => work.id === id);


        // workout.calcPace();  

        if (workout.type === 'running') {
            // Change workout datas

            const updatedWorkout = new Running(
                workout.coords,
                +inputDistance.value,
                +inputDuration.value,
                workout.cadence,
                workout.id
            );
            console.log(this.#workout);
            console.log(updatedWorkout);
            const workId = this.#workout.findIndex(work => work.id === updatedWorkout.id);

            this.#workout[workId] = updatedWorkout;
            console.log(workId);
            // console.log(this.#workout);

        }
        // console.log(work);
        // console.log(workout);
        // console.log(this.#workout);
        // formBtn.removeEventListener();

    }
    // _deleteWorkout(workout) {

    // }

    reset() {
        localStorage.removeItem('workouts');
        localStorage.reload();
    }
}
const app = new App();




