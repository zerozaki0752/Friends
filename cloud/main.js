require("cloud/app.js");

AV._initialize('zw8sz05w7m6ojd9xm5vnhrm0mzgkmqpe0kud43dmf0wl6tez', 'm8xc1qb4onqx5p8532lqo8l4hetuv7zxdwslxlmma3xl30y9', 'tq5a5ysc68etxemu5x3vhzv5zy3df4uv8qzwjmsmmp2hvued');
AV.Cloud.useMasterKey();

AV.Cloud.define("hello", function(request, response) {

    var userQ = new AV.Query(User);
    userQ.equalTo('nickname','userQ');
    userQ.first({
        success: function(object) {
            if (object)
            {
                console.log("1");
            }
            else
            {
                console.log("2");
            }
        },
        error: function(error) {
            console.log("3");
            alert("Error: " + error.code + " " + error.message);
        }
    });
});

/****************
 通用AVObject
 *****************/
var User = AV.Object.extend('_User');
var Installation = AV.Object.extend('_Installation');

var UserRelation = AV.Object.extend('UserRelation');

var Follow = AV.Object.extend('Follow');
var Friend = AV.Object.extend('Friend');
var Message = AV.Object.extend('Message');
var Schedule = AV.Object.extend('Schedule');

var Photo = AV.Object.extend('Photo');
var Comment = AV.Object.extend('Comment');
var Content = AV.Object.extend('Content');
var Brand = AV.Object.extend('Brand');
var Temperature = AV.Object.extend('Temperature');
var WeatherType = AV.Object.extend('WeatherType');

var Notification = AV.Object.extend('_Notification');

var GiftCount = AV.Object.extend('GiftCount');
var GiftWorth = AV.Object.extend('GiftWorth');
var GiftRecorder = AV.Object.extend('GiftRecorder');
var Gift = AV.Object.extend('Gift');

var AirQualityIndex = AV.Object.extend('AirQualityIndex');

var PM25AppKey = "siv7h7ydxAEBoQw5Z3Lj";

var ALUserRelationTypeOfFollow = 1;

function _saveAll(list,done)
{
    AV.Object.saveAll(list, function(list1, error) {
        done(list1,error);
    });
}

function _isEmpty(obj)
{
    return Object.keys(obj).length === 0;
}


AV.Cloud.afterSave("GiftRecorder", function(request) {

    var giftRecorder = request.object;
    var gift = AV.Object.createWithoutData('Gift',giftRecorder.get('gift').objectId);
    var fromUser = AV.Object.createWithoutData('_User',giftRecorder.get('fromUser').objectId);
    var toUser = AV.Object.createWithoutData('_User',giftRecorder.get('toUser').objectId);
    var number = giftRecorder.get('number');
    var totalWorth = giftRecorder.get('totalWorth');

    incrementGiftCount(gift,toUser,number,10,null);
    incrementGiftWorth(fromUser,toUser,totalWorth,10,null);
});

function incrementGiftCount(gift,toUser,number,tryTimes,done)
{
    if (tryTimes<=0)
    {
        done();
        return;
    }

    var giftCountQ = new AV.Query(UserRelation);
    giftCountQ.equalTo('gift',gift);
    giftCountQ.equalTo('toUser',toUser);
    giftCountQ.first({
        success: function(giftCount) {
            if (giftCount)
            {
                //已经存在
                console.log("已经存在");
                giftCount.increment('number',number);

                giftCount.save();
            }
            else
            {
                //不存在
                console.log("不存在");
                var giftCount = new GiftCount();
                giftCount.set('gift',gift);
                giftCount.set('toUser',toUser);
                giftCount.set('number',number);

                giftCount.save().then(function(object) {

                        done();

                    }, function(error) {

                        console.log("Error: " + error.code + " " + error.message);
                        incrementGiftCount(gift,toUser,number,--tryTimes,done);

                    });
            }
        },
        error: function(error) {
            //查询失败
//            alert("Error: " + error.code + " " + error.message);
            console.log("Error: " + error.code + " " + error.message);
            incrementGiftCount(gift,toUser,number,--tryTimes,done);

        }
    });
}

function incrementGiftWorth(fromUser,toUser,totalWorth,tryTimes,done)
{
    if (tryTimes<=0)
    {
        done();
        return;
    }

    var giftWorthQ = new AV.Query(UserRelation);
    giftWorthQ.equalTo('fromUser',fromUser);
    giftWorthQ.equalTo('toUser',toUser);
    giftWorthQ.first({
        success: function(giftWorth) {
            if (giftWorth)
            {
                //已经存在
                console.log("已经存在");
                giftWorth.increment('totalWorth',totalWorth);
                giftWorth.save();
            }
            else
            {
                //不存在
                console.log("不存在");
                var giftWorth = new GiftWorth();
                giftWorth.set('fromUser',fromUser);
                giftWorth.set('toUser',toUser);
                giftWorth.set('totalWorth',totalWorth);

                giftWorth.save().then(function(object) {

                    done();

                }, function(error) {

                    console.log("Error: " + error.code + " " + error.message);
                    incrementGiftCount(fromUser,toUser,totalWorth,--tryTimes,done);

                });
            }
        },
        error: function(error) {
            //查询失败
//            alert("Error: " + error.code + " " + error.message);
            console.log("Error: " + error.code + " " + error.message);
            incrementGiftCount(fromUser,toUser,totalWorth,--tryTimes,done);

        }
    });
}

AV.Cloud.define("addUserRelation", function(request, response){

    var fromUser = request.params.fromUser;
    var toUser = request.params.toUser;

    var type = request.params.type;
    var bkName = request.params.bkName;

//    console.dir(fromUser);
//    console.dir(toUser);

    //添加用户关系
    addUserRelationIfIsNotExist(fromUser,toUser,type,bkName,function (success,error){

        if (success)
        {
            checkIsBothFollow(fromUser,toUser,type,10,function(success,error){

                if (success)
                {
                    response.success();
                }
                else
                {
                    response.error(error);
                }
            });
        }
        else
        {
            response.error(error);
        }
    });
});

AV.Cloud.define("removeUserRelation", function(request, response){

    var fromUser = request.params.fromUser;
    var toUser = request.params.toUser;
    var type = request.params.type;

    //移除用户关系
    removeUserRelation(fromUser,toUser,type,function (success,error){

        if (success)
        {
            checkIsBothFollow(fromUser,toUser,type,10,function(success,error){

                if (success)
                {
                    response.success();
                }
                else
                {
                    response.error(error);
                }
            });
        }
        else
        {
            response.error(error);
        }
    });
});

function removeUserRelation(fromUser,toUser,type,done){

    var fromUser = AV.Object.createWithoutData("_User",fromUser.objectId);
    var toUser = AV.Object.createWithoutData("_User",toUser.objectId);

    console.dir(fromUser);
    console.dir(toUser);

    var userRelationQ = new AV.Query(UserRelation);
    userRelationQ.equalTo('fromUser',fromUser);
    userRelationQ.equalTo('toUser',toUser);
    userRelationQ.equalTo('type',type);
    userRelationQ.first({
        success: function(object) {
            if (object)
            {
                //已经关注
                console.log("已经关注");
                object.destroy({
                    success: function(object) {
                        console.log("删除成功");
                        done(true,null);
//                        fromUser.increment('numberOfFriends',-1);
//                        toUser.increment('numberOfFollows',-1);
//                        _saveAll([fromUser,toUser],function(list, error) {
//                            if (!error)
//                            {
//                                console.log("保存成功");
//                                done(true,null);
//                            }
//                            else
//                            {
//                                //回滚
//                                object.save();
//                                done(false,error.message);
//                            }
//                        });
                    },
                    error: function(object, error) {
                        console.log("删除失败"+error.message);
                        done(false,error.message);
                    }
                });
            }
            else
            {
                done(false,"没有关注");
                //没有关注
                console.log("没有关注");
            }
        },
        error: function(error) {
            //查询失败
//            alert("Error: " + error.code + " " + error.message);
            done(false,error.message);
        }
    });

}

function addUserRelationIfIsNotExist(fromUser,toUser,type,bkName,done){


    var fromUser = AV.Object.createWithoutData("_User",fromUser.objectId);
    var toUser = AV.Object.createWithoutData("_User",toUser.objectId);


    var userRelationQ = new AV.Query(UserRelation);
    userRelationQ.equalTo('fromUser',fromUser);
    userRelationQ.equalTo('toUser',toUser);
    userRelationQ.equalTo('type',type);
    userRelationQ.first({
        success: function(object) {
            if (object)
            {
               //已经关注
                console.log("已经关注");

                if (object.get('type') == type)
                {
                    done(false,"已经关注");
                }
                else
                {
                    //类别不同 修改类别
                    object.set('type',type);
                    object.save().then(function(object) {

                        done(true,null);

                    }, function(error) {

                        done(false,error.message);
                    });
                }
            }
            else
            {
               //没有关注
                console.log("没有关注");
                var userRelation = new UserRelation();
                userRelation.set('fromUser',fromUser);
                userRelation.set('toUser',toUser);
                userRelation.set('type',type);
                userRelation.set('bkName',bkName);
                userRelation.save().then(function(object) {

                    done(true,null);

                    }, function(error) {

                        done(false,error.message);
                 });
            }
        },
        error: function(error) {
            //查询失败
//            alert("Error: " + error.code + " " + error.message);
            console.log("Error: " + error.code + " " + error.message);
            done(false,error.message);
        }
    });
}

function checkIsBothFollow(user1, user2, type, tryTimes, done){

    if (tryTimes<=0)
    {
        done(false,"次数超过限制");
    }

    var user1 =  AV.Object.createWithoutData("_User",user1.objectId);
    var user2 = AV.Object.createWithoutData("_User",user2.objectId);

    console.dir(user1);
    console.dir(user2);

    var userRelationQ = new AV.Query(UserRelation);
    userRelationQ.equalTo('fromUser',user1);
    userRelationQ.equalTo('toUser',user2);
    userRelationQ.equalTo('type',type);
    userRelationQ.first({
        success: function(object1) {
            if (object1) //已经关注
            {
                console.log("互粉:已经关注");
                var userRelationQ = new AV.Query(UserRelation);
                userRelationQ.equalTo('fromUser',user2);
                userRelationQ.equalTo('toUser',user1);
                userRelationQ.equalTo('type',type);
                userRelationQ.first({
                    success: function(object2) {
                        if (object2)//已经粉丝
                        {
                            console.log("互粉:已经粉丝");
//                            user1.increment('numberOfBilaterals');
//                            user2.increment('numberOfBilaterals');
                            object1.set('isBothFollow',true);
                            object2.set('isBothFollow',true);

                            _saveAll([user1, user2, object1, object2], function(list, error) {
                                if (list)
                                {
                                    done(true,null);
                                }
                                else
                                {
                                    //保存失败
                                    checkIsBothFollow(user1, user2, type, --tryTimes, done);
                                }
                            });
                        }
                        else
                        {
                            //没有粉丝
                            console.log("互粉:不是粉丝");
                            done(true,null);
                        }

                    },
                    error: function(error) {
                        //查询失败
                        checkIsBothFollow(user1, user2, type, --tryTimes, done);
                    }
                });
            }
            else
            {
                //没有关注
                console.log("互粉:不是关注");
                done(true,null);
            }
        },
        error: function(error) {
            //查询失败
            checkIsBothFollow(user1, user2, type, --tryTimes, done);
        }
    });
}

//function checkUserRelation(user,type,tryTimes,done)
//{
//    if (tryTimes<=0)
//    {
//        done(false,"次数超过限制");
//    }
//
//    var user = AV.Object.createWithoutData("_User",user.id);
//
//    var friendsQ = new AV.Query(UserRelation);
//    friendsQ.equalTo('fromUser',user);
//    friendsQ.equalTo('type',type);
//    friendsQ.count({
//        success: function(numberOfFriends) {
//
//            user.set('numberOfFriends',numberOfFriends);
//
//            var followQ = new AV.Query(UserRelation);
//            followQ.equalTo('toUser',user);
//            followQ.equalTo('type',type);
//            followQ.count({
//                success: function(numberOfFollows) {
//
//                    user.set('numberOfFollows',numberOfFollows);
//                    var bilateralFollowQ = new AV.Query(UserRelation);
//                    bilateralFollowQ.equalTo('fromUser',user);
//                    bilateralFollowQ.equalTo('type',type);
//                    bilateralFollowQ.equalTo('isBilateral',true);
//                    bilateralFollowQ.count({
//                        success: function(numberOfBilaterals) {
//
//                            user.set('numberOfBilaterals',numberOfBilaterals);
//
//                            user.save().then(function(user) {
//
//                                done(true,null);
//
//
//
//                            },function(error){
//
//                                checkUserRelation(user,type,--tryTimes,done);
//
//                            });
//                        },
//                        error: function(error) {
//                            checkUserRelation(user,type,--tryTimes,done);
//                        }
//                    });
//                },
//                error: function(error) {
//                    checkUserRelation(user,type,--tryTimes,done);
//                }
//            });
//        },
//        error: function(error) {
//            checkUserRelation(user,type,--tryTimes,done);
//        }
//    });
//
//}
