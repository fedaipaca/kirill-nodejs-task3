import express, {Request, Response} from 'express';
import Joi, {ValidationErrorItem, ValidationResult, Schema} from 'joi';
import { v4 as uuidv4 } from 'uuid';
import {userSchema, MappedErrors, IUserToService, IUserToClient} from "./2_2";

// EXAMPLE of user
// {
//     "id": "5354554357345",
//     "login": "Olaf",
//     "age": 0,
//     "password": 'a2A',
//     "isDeleted": false
// }
const defMap = Object.entries(
    {
        "403357.1108310962": {
            "id": "403357.1108310962",
            "login": "Asteriks",
            "age": 90,
            "password": "g4G",
            "isDeleted": false
        },
        "403353.9108310968": {
            "id": "403353.9108310968",
            "login": "Varmid",
            "age": 9,
            "password": "g4G",
            "isDeleted": false
        },
        "8687296.470471686": {
            "id": "8687296.470471686",
            "login": "Olaf",
            "age": 9,
            "password": "g4G",
            "isDeleted": false
        },
        "8489232.1256684": {
            "id": "8489232.1256684",
            "login": "Hold",
            "age": 9,
            "password": "g4G",
            "isDeleted": false
        },
        "912165.7183257148": {
            "id": "912165.7183257148",
            "login": "Tor",
            "age": 9,
            "password": "g4G",
            "isDeleted": false
        },
        "5938013.000591949": {
            "id": "5938013.000591949",
            "login": "Goro",
            "age": 9,
            "password": "g4G",
            "isDeleted": false
        },
        "2758694.634640233": {
            "id": "2758694.634640233",
            "login": "Valhen",
            "age": 9,
            "password": "g4G",
            "isDeleted": false
        },
        "4539556.105923821": {
            "id": "4539556.105923821",
            "login": "Valder",
            "age": 9,
            "password": "g4G",
            "isDeleted": false
        },
        "2336200.519486169": {
            "id": "2336200.519486169",
            "login": "Varmin",
            "age": 9,
            "password": "g4G",
            "isDeleted": false
        }
    }
);

// consts
const app = express();
const router = express.Router();
const db = new Map(defMap);
const port = process.env.PORT || 3000;

const NotFoundByIDMessage = `User with this id not found`;

// helpers
const mapErrors = (schemaErrors: ValidationErrorItem[]): MappedErrors => {
    const errors = schemaErrors.map(({ message, path }) => ({ message, path }));

    return {
        status: 'failed',
        errors,
    };
};
const userGetter = (id: string): IUserToClient | null => {
    const user = db.get(id);
    if (!user || user.isDeleted) {
        return null;
    }

    const { isDeleted, ...rest } = user;

    return rest;
};
const noServiceFields = (arr: IUserToService[]): IUserToClient[] => arr.map(({isDeleted, ...rest}) => rest);

// middlewares
const getUser = (req: Request, res: Response) => {
    const user = userGetter(req.params.id);

    if (!user) {
        res.status(404).json({ error: 'User not found.' })
    } else {
        res.json(user);
    }
};
const removeUser = (req: Request, res: Response) => {
    const { id } = req.params;
    const user = userGetter(id);
    if (!user) {
        res.json({message: NotFoundByIDMessage});
    } else {
        db.set(req.params.id, { ...user, isDeleted: true });
        res.json({message: `User ${ user.login } has been removed`});
    }
};
const updateUser = (req: Request, res: Response) => {
    const user = userGetter(req.params.id);
    const updates = req.body;
    if (!user) {
        res.json({message: NotFoundByIDMessage});
    } else {
        db.set(req.params.id, { ...user, ...updates });
        res.json({message: `User ${ user.login } has been updated`});
    }
};
const addUser = (req: Request, res: Response) => {
    const newUser: IUserToService = req.body;
    const result: ValidationResult<Schema> = userSchema.validate(newUser, { abortEarly: false, allowUnknown: false });

    if (Joi.isError(result.error)) {
        const mapped = mapErrors(result.error.details);
        res.status(400).json(mapped);
    } else {
        const id = uuidv4();
        db.set(id, { ...newUser, isDeleted: false });
        res.status(201).json({ ...newUser, id });
    }
};
const getUserList = (req: Request, res: Response) => {
    const entries = [...db.values()];
    if (!Object.keys(entries).length) {
        res.json({message: 'Database is empty.'});
    } else {
        res.json(noServiceFields(entries));
    }
};
const getUserListByName = (req: Request, res: Response) => {
    const { login } = req.params;
    const { limit } = req.query;
    if (!login) {
        res.json({message: 'Login can not be empty'});
    } else {
        const sorted = noServiceFields(
            [...db.values()]
                .filter(u => ~u.login.indexOf(login))
                .sort((u1, u2) => u1.login.localeCompare(u2.login))
        );

        res.json({ sorted: limit ? sorted.splice(0, Number(limit)) : sorted});
    }
}


// API by id
router.route('/users/:id')
    .get(getUser)
    .delete(removeUser)
    .patch(updateUser);

// API list
router.route('/users')
    .post(addUser)
    .get(getUserList);
router.route('/users/byName/:login')
    .get(getUserListByName);


app.use(express.json());
app.use(router);
app.listen(port);




// QUESTIONS
// middlewares are chained and composed in certain order. So should I use return in any and what happens if I do?