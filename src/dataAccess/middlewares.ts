import {Request, Response} from "express";
import Joi from "joi";
import {IUserBasic} from "../types";
import {
    handleUpdateUser,
    handleUserCreation,
    handleUserListByName,
    mapErrors,
    noServiceFields,
    userGetter,
    validateUser
} from "../services";
import {User} from "../models";

const NotFoundByIDMessage = `User with this id not found`;

export const getUser = async (req: Request, res: Response) => {
    const user = await userGetter(req.params.id);

    if (user) {
        res.json(noServiceFields(user));
    } else {
        res.status(404).json({ error: 'User not found.' })
    }
};

export const addUser = async (req: Request, res: Response) => {
    const validated = validateUser(req.body);

    if (Joi.isError(validated.error)) {
        const mapped = mapErrors(validated.error.details);
        res.status(400).json(mapped);
    } else {
        // Note: Got lost here in types, not sure how to handle properly =(
        const result = await handleUserCreation(validated.value as unknown as IUserBasic);
        if (result) {
            res.json({result: noServiceFields(result), status: 201})
        } else {
            res.json({message: 'User already exist', status: 400});
        }
    }
};

export const getUserList = async (req: Request, res: Response) => {
    const userList = await userGetter();

    if(Array.isArray(userList)) {
        if (!userList.length) {
            res.json({message: 'Database is empty.'});
        }
        res.json(noServiceFields(userList));
    }
};

// Note: In the beginning it was requested to have isDeleted field for soft deletion.
// But since sequelize has this out of box, it makes me feel like I am inventing the wheel instead of using default behavior of sequelize.
// Thus, I am using my own wheel with Model.update() instead of Model.drop()
export const removeUser = async (req: Request, res: Response) => {
    const {id} = req.params;
    const user = await userGetter(id);

    if (!user) {
        res.json({message: NotFoundByIDMessage, status: 400});
    } else {
        return await deleteUser(id);
    }
};

export const updateUser = async (req: Request, res: Response) => {
    const {id} = req.params;
    const updates = req.body;
    const result = await handleUpdateUser(id, updates);
    // Note: I rly don't like these responses - [1/0]. What would be better to have here though?
    if (!result[0]) {
        res.json({message: NotFoundByIDMessage});
    } else {
        res.json({message: `User has been updated`});
    }
};

export const getUserListByName = async (req: Request, res: Response) => {
    const { login } = req.params;
    const { limit } = req.query;
    if (!login) {
        res.json({message: 'Login can not be empty'});
    } else {
        // Note: also here not sure regarding type
        const list = await handleUserListByName(login, limit as any);
        res.json(list);
    }
};

export const deleteUser = async (id: string): Promise<{ message: string }> => {
    const result = await User.update({ isdeleted: true }, {where: {id: id}});
    if (result) {
        return {message: `User has been deleted`};
    } else {
        return {message: `Something went wrong)`};
    }
};