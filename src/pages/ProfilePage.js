import React, { useContext } from "react";
import { AuthContext } from "../App";

const ProfilePage = () => {
    const { user } = useContext(AuthContext);

    return (
        <div>
            <h2>Profile</h2>
            {user ? (
                <div>
                    <p><strong>ID:</strong> {user.id}</p>
                    <p><strong>Name:</strong> {user.name}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                </div>
            ) : (
                <p>User not found</p>
            )}
        </div>
    );
};

export default ProfilePage;
