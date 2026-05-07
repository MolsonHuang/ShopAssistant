import frappe
import requests
from frappe import _
from frappe.utils import now


CODE2SESSION_URL = "https://api.weixin.qq.com/sns/jscode2session"


def _wechat_settings():
    appid = frappe.conf.get("wechat_mini_appid")
    secret = frappe.conf.get("wechat_mini_secret")
    if not appid or not secret:
        frappe.throw(_("WeChat Mini Program AppID or secret is not configured."))
    return appid, secret


def _sync_user_roles(user_name, role_profile_name=None):
    if not role_profile_name:
        return

    profile = frappe.get_doc("Shop Role Profile", role_profile_name)
    if not profile.role:
        return

    user = frappe.get_doc("User", user_name)
    if not any(row.role == profile.role for row in user.roles):
        user.append("roles", {"role": profile.role})
        user.save(ignore_permissions=True)


@frappe.whitelist(allow_guest=True)
def wechat_login(code, nickname=None):
    code = (code or "").strip()
    if not code:
        frappe.throw(_("WeChat login code is required."))

    appid, secret = _wechat_settings()
    response = requests.get(
        CODE2SESSION_URL,
        params={
            "appid": appid,
            "secret": secret,
            "js_code": code,
            "grant_type": "authorization_code",
        },
        timeout=10,
    )
    data = response.json()
    if data.get("errcode"):
        frappe.throw(_("WeChat login failed: {0}").format(data.get("errmsg") or data.get("errcode")))

    openid = data.get("openid")
    unionid = data.get("unionid")
    if not openid:
        frappe.throw(_("WeChat did not return an OpenID."))

    binding_name = frappe.db.exists("Shop Wechat Binding", {"wechat_openid": openid})
    if binding_name:
        binding = frappe.get_doc("Shop Wechat Binding", binding_name)
        changed = False
        if unionid and binding.wechat_unionid != unionid:
            binding.wechat_unionid = unionid
            changed = True
        if nickname and binding.nickname != nickname:
            binding.nickname = nickname
            changed = True
        binding.last_login = now()
        changed = True
        if changed:
            binding.save(ignore_permissions=True)
    else:
        binding = frappe.get_doc(
            {
                "doctype": "Shop Wechat Binding",
                "wechat_openid": openid,
                "wechat_unionid": unionid,
                "nickname": nickname,
                "enabled": 0,
                "last_login": now(),
            }
        )
        binding.insert(ignore_permissions=True)

    if not binding.enabled or not binding.user:
        return {
            "bound": False,
            "binding": binding.name,
            "message": _("WeChat account is waiting for an administrator to bind it to an ERPNext user."),
        }

    _sync_user_roles(binding.user, binding.role_profile)
    frappe.local.login_manager.login_as(binding.user)
    roles = frappe.get_roles(binding.user)
    return {
        "bound": True,
        "user": binding.user,
        "roles": roles,
        "home_page": "/app/shop-assistant",
    }
