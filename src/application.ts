///<reference path="../typings/lodash/lodash"/>
///<reference path="../typings/rx/rx"/>
///<reference path="../typings/rx/rx-lite"/>

import { Initialize } from './utils/initialize';
import { Injector, injector } from './helpers/injector';

Initialize.init(injector);

import * as _ from 'lodash';
import { Observable } from 'rx';

import { Course, CourseFactory } from './models/course';
import { Exception, ExceptionFactory } from './models/exception';
import { User, UserFactory } from './models/user';
import { Person, PersonFactory } from './models/person';

import { Cacher } from './helpers/cacher';
import { Caller } from './helpers/caller';
import { Fetcher } from './helpers/fetcher';
import { Seeker } from './helpers/seeker';

import { ISearchCoursesOption, ISearchPeopleOption } from './utils/interfaces';

/** @unaccessible Dependency instance. */
var cacher: Cacher = injector.get('Cacher');
/** @unaccessible Dependency instance. */
var caller: Caller = injector.get('Caller');
/** @unaccessible Dependency instance. */
var fetcher: Fetcher = injector.get('Fetcher');
/** @unaccessible Dependency instance. */
var seeker: Seeker = injector.get('Seeker');

/** @unaccessible Dependency instance. */
var userFactory: UserFactory = injector.get('UserFactory');
/** @unaccessible Dependency instance. */
var exceptionFactory: ExceptionFactory = injector.get('ExceptionFactory');

/** 
 * @class
 * Represents an instance of SDK application. The entry of the entire library.
 */
export class Application {
    /**
     * @property
     * The user instance for application global operations.
     */
    private currentUser: User;
    
    /**
     * @constructor
     * The constructor of Application class.
     */
    constructor () {
        this.currentUser = _.find(cacher.users, (user) => user.isConfirmed) || null;
    }
    
    /**
     * @method
     * Get the Injector instance of current application.
     * @returns the Injector instance of current application.
     */
    getInjector (): Injector {
        return injector;
    }
    
    /**
     * @method
     * Get the exact user of given student id which has been registered before.
     * @param id The student id of the student.
     * @returns The student instance if exist, null if not.
     */
    one (id: string): User {
        return cacher.users[id] || null;
    }

    /**
     * @method
     * Register a student entity with student id and password.
     * @param id The student id of the student.
     * @param password The password of the UESTC Portal site.
     * @returns The student instance of the given student id.
     */
    register (id: string, password: string): User {
        var user: User;
        cacher.users[id] = user = userFactory.$new(id, password);
        
        if(!this.isUserExist()) {
            user.confirm().subscribe(() => this.currentUser = user);
        }
        return user;
    }
    
    /**
     * @method
     * Search for courses that satisfy the given option online.
     * @param option The option of the search.
     * @param callback The function to be called with an error or the result of search if don't want to use the Observable operations. It's deprecated.
     * @returns The Observable instance of the search result.
     */
    searchForCourses (option: ISearchCoursesOption, callback?: { (error: Exception, courses: Course[]): void; }): Observable<Course[]> {       
        var observable = Observable.create<Course[]>((observer) => {
            if(!this.isUserExist()) {
                observer.onError(exceptionFactory.$new(401, 'Application#searchForCourses must be called with a current user.'));
            }
        }).merge(fetcher.searchForCourses(option));
        caller.nodifyObservable(observable, callback);
        return observable;
    }
    
    /**
     * @method
     * Search for courses that satisfy the given option offline.
     * @param option The option of the search.
     * @param callback The function to be called with an error or the result of search if don't want to use the Observable operations. It's deprecated.
     * @returns The Observable instance of the search result.
     */
    searchForCoursesInCache (option: ISearchCoursesOption, callback?: { (error: Exception, courses: Course[]): void; }): Observable<Course[]> {
        var observable = seeker.searchForCourses(option);
        caller.nodifyObservable(observable, callback);
        return observable;
    }
    
    /**
     * @method
     * Search for courses that satisfy the given option online when possible, offline when necessary.
     * @param option The option of the search.
     * @param callback The function to be called with an error or the result of search if don't want to use the Observable operations. It's deprecated.
     * @returns The Observable instance of the search result.
     */
    searchForCoursesWithCache (option: ISearchCoursesOption, callback?: { (error: Exception, courses: Course[]): void; }): Observable<Course[]> {
        var observable = this.searchForCourses(option)
            .catch(this.searchForCoursesInCache(option)); 
        caller.nodifyObservable(observable, callback);
        return observable;
    }
    
    /**
     * @method
     * Search for people that satisfy the given option online.
     * @param option The option of the search.
     * @param callback The function to be called with an error or the result of search if don't want to use the Observable operations. It's deprecated.
     * @returns The Observable instance of the search result.
     */
    searchForPeople (option: ISearchPeopleOption, callback?: { (error: Exception, people: Person[]): void; }): Observable<Person[]> {       
        var observable = Observable.create<Person[]>((observer) => {
            if(!this.isUserExist()) {
                observer.onError(exceptionFactory.$new(401, 'Application#searchForPeople must be called with a current user.'));
            }
        }).merge(fetcher.searchForPeople(option));
        caller.nodifyObservable(observable, callback);
        return observable;
    }
    
    /**
     * @method
     * Search for people that satisfy the given option offline.
     * @param option The option of the search.
     * @param callback The function to be called with an error or the result of search if don't want to use the Observable operations. It's deprecated.
     * @returns The Observable instance of the search result.
     */
    searchForPeopleInCache (option: ISearchPeopleOption, callback?: { (error: Exception, people: Person[]): void; }): Observable<Person[]> {
        var observable = seeker.searchForPeople(option);
        caller.nodifyObservable(observable, callback);
        return observable;
    }
    
    /**
     * @method
     * Search for people that satisfy the given option online when possible, offline when necessary.
     * @param option The option of the search.
     * @param callback The function to be called with an error or the result of search if don't want to use the Observable operations. It's deprecated.
     * @returns The Observable instance of the search result.
     */
    searchForPeopleWithCache (option: ISearchPeopleOption, callback?: { (error: Exception, people: Person[]): void; }): Observable<Person[]> {
        var observable = this.searchForPeople(option)
            .catch(this.searchForPeopleInCache(option));   
        caller.nodifyObservable(observable, callback);
        return observable;
    }
    
    /**
     * @method
     * Verify whether the given student id and password is valid. Notice that if some other accident occurs (i.e. No network), the result would be null, please check the error.
     * @param id The student id of the student.
     * @param password The password of the student.
     * @param callback The function to be called with an error or the result of search if don't want to use the Observable operations. It's deprecated.
     * @returns The boolean result of valid or not. 
     */
    verify (id: string, password: string, callback?: { (error: Exception, result: boolean): void; }): Observable<boolean> {
        var user = new User(id, password);
        var observable = user.confirm();
        caller.nodifyObservable(observable, callback);
        return observable;
    }
    
    /**
     * @method
     * Check whether there is a user to deal with global operation.
     * @returns The boolean result of exist or not.
     */
    private isUserExist (): boolean {
        return !!this.currentUser;
    }
}

/**
 * @instance
 * The Application instance for quick access.
 */
export const app: Application = new Application();
