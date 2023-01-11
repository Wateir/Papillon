<script>
    import { defineComponent } from 'vue';
    import { IonHeader, IonContent, IonToolbar, IonTitle, IonMenuButton, IonPage, IonList, IonItem, IonLabel, IonCheckbox, IonListHeader, IonButton, IonSpinner, IonRefresher, IonChip } from '@ionic/vue';

    import { informationCircle } from 'ionicons/icons';

    import { Capacitor } from '@capacitor/core';

    import displayToast from '@/functions/utils/displayToast.js';
    import hapticsController from '@/functions/utils/hapticsController.js';

    import GetToken from '@/functions/login/GetToken.js';
    import GetNews from '@/functions/fetch/GetNews.js';

    // timetable
    import CoursElement from '@/components/timetable/CoursElement.vue';
    import GetTimetable from '@/functions/fetch/GetTimetable.js';

    // homeworks
    import GetHomeworks from "@/functions/fetch/GetHomeworks.js";

    export default defineComponent({
        name: 'FolderPage',
        components: {
            IonHeader,
            IonContent,
            IonToolbar,
            IonTitle,
            IonMenuButton,
            IonPage,
            IonList,
            IonListHeader,
            IonButton,
            IonItem,
            IonLabel,
            IonCheckbox,
            IonSpinner,
            IonRefresher,
            IonChip
        },
        data() {
            return { 
                timetable: [],
                nextCoursTime: "",
                updateTime: null,
                firstName: '',
                homeworks: [],
                blockChangeDone: false,
                editMode: false
            }
        },
        methods: {
            goto(url) {
                this.$router.push(url);
            },
            editTimetable(timetable) {
                // add sameTime property to courses that are at the same time
                for(let i = 0; i < timetable.length; i++) {
                    let lesson = timetable[i];
                    let lessonStart = new Date(lesson.time.start);
                    let lessonEnd = new Date(lesson.time.end);

                    for(let j = 0; j < timetable.length; j++) {
                        let lesson2 = timetable[j];
                        let lesson2Start = new Date(lesson2.time.start);
                        let lesson2End = new Date(lesson2.time.end);

                        if (lessonStart <= lesson2Start && lessonEnd >= lesson2End && lesson.course.num != lesson2.course.num) {
                            if (lesson.course.num > lesson2.course.num) {
                                timetable[j].course.sameTime = true;
                            }
                            else {
                                timetable[i].course.sameTime = true;
                            }
                        }
                    }
                }

                // get next lesson (cours.time.start)
                let now = new Date();
                let lessons = timetable.filter((lesson) => {
                    let lessonStart = new Date(lesson.time.start);
                    let lessonEnd = new Date(lesson.time.end);

                    if (lessonStart <= now && lessonEnd >= now) {
                        // get minutes before next lesson
                        let mins = Math.floor((lessonEnd - now) / 1000 / 60);

                        // if less than 60 mins
                        if (mins < 60) {
                            this.nextCoursTime = `dans ${mins} minutes`;
                        }
                        else {
                            let hours = Math.floor(mins / 60);
                            mins = mins % 60;

                            this.nextCoursTime = `dans ${hours} heures et ${mins} minutes`;
                        }

                        return true;
                    }
                    else {
                        return false;
                    }
                });

                // if lessons is empty but not timetable, get last lesson
                if (lessons.length == 0 && timetable.length > 0) {
                    let lastLesson = timetable[timetable.length - 1];
                    lessons.push(lastLesson);

                    this.nextCoursTime = "Cours terminé"
                }
                
                return lessons;
            },
            getTimetable(force) {
                this.timetable.loading = true;
                GetTimetable(this.$rn, force).then((timetable) => {
                    if(timetable.error) {
                        this.timetable = [];
                        this.timetable.error = timetable.error;

                        if(timetable.error == "ERR_BAD_REQUEST") {
                            this.timetable.error = null;
                        }
                    }
                    else {
                        this.timetable = this.editTimetable(timetable);
                        
                        this.updateTime = setInterval(() => {
                            this.timetable = this.editTimetable(timetable);
                        }, 1000);

                        this.timetable.loading = false;
                    }
                });
            },
            getHomeworks(force) {
                // get date for this.$rn + 1 day
                let tomorrow = new Date(this.$rn);
                tomorrow.setDate(tomorrow.getDate() + 0);

                this.homeworks.loading = true;
                GetHomeworks(tomorrow, force).then((homeworks) => {
                    if(homeworks.error) {
                        this.homeworks = [];
                        this.homeworks.error = homeworks.error;

                        if(homeworks.error == "ERR_BAD_REQUEST") {
                            this.homeworks.error = null;
                        }
                    }
                    else {
                        this.homeworks = homeworks;
                        console.log(this.homeworks)
                        this.homeworks.loading = false;
                    }
                });
            },
            changeDone(hw) {
                if(!this.blockChangeDone) {
                    displayToast.presentToastFull(
                        "Allez dans la page devoirs pour marquer un devoir comme fait",
                        `Vous ne pouvez pas changer l'état d'un devoir depuis l'écran d'accueil.`,
                        "warning",
                        informationCircle
                    )

                    let checkboxID = `checkbox_${hw.data.id}`;
                    let checkbox = document.getElementById(checkboxID);

                    if (checkbox) {
                        setTimeout(() => {
                            this.blockChangeDone = true;
                            setTimeout(() => {
                                this.blockChangeDone = false;
                            }, 100);

                            checkbox.checked = !checkbox.checked;
                        }, 300);
                    }
                }
            },
            reorder() {
                let order = ["comp-hw", "comp-tt"]

                let components = document.getElementById("components");
                if (components) {
                    for (let i = 0; i < order.length; i++) {
                        let comp = document.getElementById(order[i]);
                        if (comp) {
                            components.appendChild(comp);
                        }
                    }
                }
            },
            handleRefresh(event) {
                this.getTimetable(true);
                this.getHomeworks(true);

                setTimeout(() => {
                    event.detail.complete();
                }, 1000);
            }
        },
        mounted() {
            if(localStorage.getItem('userData')) {
                // get first name
                let name = JSON.parse(localStorage.getItem('userData')).student.name;
                // get last word of name
                this.firstName = name.split(' ').pop();
            }

            // get data
            this.getTimetable();

            document.addEventListener('tokenUpdated', (e) => {
                this.getTimetable();
                this.getHomeworks();
            });

            this.getHomeworks();

            // reorder divs in #components
            // this.reorder();
        }
    });
</script>

<template>
    <ion-page ref="page">
      <IonHeader class="AppHeader">
        <IonToolbar>

          <ion-buttons slot="start">
            <ion-menu-button color="dark" mode="md"></ion-menu-button>
          </ion-buttons>

          <ion-title mode="md">Vue d'ensemble</ion-title>
        </IonToolbar>
      </IonHeader>
      
      <ion-content :fullscreen="true">

        <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
            <ion-refresher-content></ion-refresher-content>
        </ion-refresher>

        <div id="components" ref="components">
            <ion-list id="comp-tt" class="nextCourse" ref="comp-tt">
                <ion-list-header>
                    <ion-label>Prochain cours</ion-label>
                    <ion-button @click="goto('timetable')">Ma journée</ion-button>
                </ion-list-header>

                <ion-item class="nextCours" v-for="cours in timetable" :key="cours.id" lines="none">
                    <IonChip slot="start">{{ cours.time.start.toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }}</IonChip>
                    <ion-label>
                        <h2>{{ cours.data.subject }}</h2>
                        <h3>{{ nextCoursTime }}</h3>
                        <p>salle {{ cours.data.rooms.join(', ') || 'Pas de salle' }} - avec {{ cours.data.teachers.join(', ') || 'Pas de professeur' }}</p>
                        <p v-if="cours.status.status">{{ cours.status.status }}</p>
                    </ion-label>
                </ion-item>

                <ion-item v-if="timetable.error" lines="none">
                    <ion-label>
                        <h2>Erreur</h2>
                        <p>{{ timetable.error }}</p>
                    </ion-label>
                </ion-item>

                <ion-item v-if="timetable == []" lines="none">
                    <ion-label>
                        <h2>Aucun cours</h2>
                        <p>Vous n'avez aucun cours aujourd'hui.</p>
                    </ion-label>
                </ion-item>

                <ion-item v-if="timetable.loading" lines="none">
                    <IonSpinner slot="start"></IonSpinner>
                    <ion-label>
                        <h2>Chargement...</h2>
                        <p>Chargement des cours...</p>
                    </ion-label>
                </ion-item>
            </ion-list>

            <ion-list id="comp-hw" ref="comp-hw">
                <ion-list-header>
                    <ion-label>Travail à faire</ion-label>
                    <ion-button @click="goto('homework')">Voir tout</ion-button>
                </ion-list-header>

                <ion-item v-for="homework in homeworks" :key="homework.id">
                    <div slot="start">
                        <ion-checkbox :id="`checkbox_${homework.data.id}`" :checked="homework.data.done" @ionChange="changeDone(homework)"></ion-checkbox>
                    </div>
                    <ion-label :style="`--courseColor: ${homework.data.color};`">
                        <p><span class="courseColor"></span>  {{ homework.homework.subject }}</p>
                        <h2>{{ homework.homework.content }}</h2>
                    </ion-label>
                </ion-item>

                <ion-item v-if="homeworks.error" lines="none">
                    <ion-label>
                        <h2>Erreur</h2>
                        <p>{{ homeworks.error }}</p>
                    </ion-label>
                </ion-item>

                <ion-item v-if="homeworks == []" lines="none">
                    <ion-label>
                        <h2>Aucun devoir</h2>
                        <p>Vous n'avez aucun devoir à faire aujourd'hui.</p>
                    </ion-label>
                </ion-item>

                <ion-item v-if="homeworks.loading" lines="none">
                    <IonSpinner slot="start"></IonSpinner>
                    <ion-label>
                        <h2>Chargement...</h2>
                        <p>Chargement des devoirs...</p>
                    </ion-label>
                </ion-item>
            </ion-list>
        </div>

      </ion-content>
    </ion-page>
</template>
  
<style scoped>
    .nextCourse ion-chip {
        padding: 6px 9px !important;
        height: fit-content;
        font-weight: 600;
        font-size: 16px;
        font-family: "Papillon";
    }

    .ios .nextCours {
        padding: 5px 18px;
    }

    .ios .nextCours::part(native) {
        background: var(--ion-color-step-50);
        border-radius: 12px;
        padding: 5px 15px;
    }

    .md .nextCours {
        padding: 5px 12px;
    }

    .md .nextCours::part(native) {
        border-radius: 8px;
        padding: 3px 10px;
        border: 1px solid var(--ion-color-step-150);
    }
</style>