var env = process.env.NODE_ENV || 'localhost';
var config = require(__dirname + '/../config/config.json')[env];
var Sequelize = require('sequelize');
var sequelize = new Sequelize(config.database, config.username, config.password, config);
const { hash } = require('bcryptjs');
const Op = sequelize.Op;

//Model
const _modelDb = require('../models').ms_approvalmatrixapproverusers;
const _modelApprovalMatrixApprover = require('../models').ms_approvalmatrixapprovers;
const _modelUser = require('../models').ms_users;

const Utility = require('peters-globallib');
const _utilInstance = new Utility();

class ApprovalMatrixApproverUserRepository {
    constructor(){}

    async list( pParam ){

        var xWhereApprovalMatrixApprover = {};

        var xOrder = ['id', 'ASC'];
        var xInclude = [
            {
                model: _modelApprovalMatrixApprover,
                as: 'approval_matrix_approver',
            },
            {
                attributes: ['id','name','email'],
                model: _modelUser,
                as: 'user',
            }
        ];

        if( pParam.hasOwnProperty('approval_matrix_approver_id') ){
            if( pParam.approval_matrix_approver_id != '' ){
                xWhereApprovalMatrixApprover = {
                    approval_matrix_approver_id: pParam.approval_matrix_approver_id,
                }
            }
        }

        if( pParam.order_by != '' && pParam.hasOwnProperty('order_by') ){
            xOrder = [pParam.order_by, (pParam.order_type == 'desc' ? 'DESC' : 'ASC') ];
        }

        var xParamQuery = {
            where: {
                [Op.and]:[
                    {
                        is_delete: 0
                    },
                    xWhereApprovalMatrixApprover,
                ],
            },          
            include: xInclude,  
            order: [xOrder],
        };

        if( pParam.hasOwnProperty('offset') && pParam.hasOwnProperty('limit') ){
            if( pParam.offset != '' && pParam.limit != ''){
                xParamQuery.offset = pParam.offset;
                xParamQuery.limit = pParam.limit;
            }
        }

        var xData = await _modelDb.findAndCountAll(xParamQuery);

        return xData;
    }

    async getById( pParam ){
        var xInclude = [
            {
                model: _modelApprovalMatrixApprover,
                as: 'approval_matrix_approver',
            },
            {
                attributes: ['id','name','email'],
                model: _modelUser,
                as: 'user',
            }
        ];
        var xData = await _modelDb.findOne({
            where: {
                id: pParam.id,
                is_delete: 0,
            },
            include: xInclude,
        });

        return xData;
    }

    async save(pParam, pAct){
        let xTransaction;
        var xJoResult = {};
        
        try{

            var xSaved = null;
            xTransaction = await sequelize.transaction();

            if( pAct == "add" ){

                pParam.status = 1;
                pParam.is_delete = 0;

                xSaved = await _modelDb.create(pParam, {xTransaction}); 

                if( xSaved.id != null ){

                    await xTransaction.commit();

                    xJoResult = {
                        status_code: "00",
                        status_msg: "Data has been successfully saved",
                        created_id: await _utilInstance.encrypt( (xSaved.id).toString(), config.cryptoKey.hashKey ),
                    }                     
                    

                }else{

                    if( xTransaction ) await xTransaction.rollback();

                    xJoResult = {
                        status_code: "-99",
                        status_msg: "Failed save to database",
                    }

                }                

            }else if( pAct == "update" ){
                
                pParam.updatedAt = await _utilInstance.getCurrDateTime();
                var xId = pParam.id;
                delete pParam.id;
                var xWhere = {
                    where : {
                        id: xId,
                    }
                };
                xSaved = await _modelDb.update( pParam, xWhere, {xTransaction} );

                await xTransaction.commit();

                xJoResult = {
                    status_code: "00",
                    status_msg: "Data has been successfully updated"
                }

            }

        }catch(e){
            if( xTransaction ) await xTransaction.rollback();
            xJoResult = {
                status_code: "-99",
                status_msg: "Failed save or update data. Error : " + e,
                err_msg: e
            }
            
        }
        
        return xJoResult;
    }

    async delete( pParam ){
        let xTransaction;
        var xJoResult = {};

        try{
            var xSaved = null;
            xTransaction = await sequelize.transaction();

            xSaved = await _modelDb.update(
                {
                    is_delete: 1,
                    deleted_by: pParam.deleted_by,
                    deleted_by_name: pParam.deleted_by_name,
                    deleted_at: await _utilInstance.getCurrDateTime(),
                },
                {
                    where: {
                        id: pParam.id
                    }
                },
                {xTransaction}
            );
    
            await xTransaction.commit();

            xJoResult = {
                status_code: "00",
                status_msg: "Data has been successfully deleted",
            }

            return xJoResult;

        }catch(e){
            if( xTransaction ) await xTransaction.rollback();
            xJoResult = {
                status_code: "-99",
                status_msg: "Failed save or update data",
                err_msg: e
            }

            return xJoResult;
        }
    }

    async deletePermanent( pParam ){
        let xTransaction;
        var xJoResult = {};

        try{
            var xSaved = null;
            xTransaction = await sequelize.transaction();

            xSaved = await _modelDb.destroy(
                {
                    where: {
                        approval_matrix_approver_id: pParam.approval_matrix_approver_id,
                    },
                },
                {xTransaction});
    
            await xTransaction.commit();

            xJoResult = {
                status_code: "00",
                status_msg: "Data has been successfully deleted",
            }

            return xJoResult;

        }catch(e){
            if( xTransaction ) await xTransaction.rollback();
            xJoResult = {
                status_code: "-99",
                status_msg: "Failed delete data",
                err_msg: e
            }

            return xJoResult;
        }
    }
}

module.exports = ApprovalMatrixApproverUserRepository;

